<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\Process as SymfonyProcess;

class DeployFrontCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'deploy:cloud
                            {--dry-run : Print git/SSH commands without executing them}
                            {--skip-build : Skip local npm run build and dist merge}
                            {--skip-push : Skip git add/commit/push after merge}
                            {--skip-remote : Skip SSH (git pull + public_html sync)}
                            {--message= : Git commit message (defaults to config deploy.git.commit_message)}
                            {--remote-delete : Pass --delete to remote rsync (remove files in public_html/front not in source)}
                            {--migrate : On the server, run php artisan migrate --force in Amazon-Marine-System/back (after git pull)}
                            {--migrate-fresh : On the server, run php artisan migrate:fresh --force in /back}
                            {--migrate-seed : On the server, run php artisan migrate --force --seed in /back}
                            {--migrate-fresh-seed : On the server, run php artisan migrate:fresh --force --seed in /back}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Build the front app, merge dist into the front root, push to GitHub, then SSH to pull the repo, optionally run Laravel migrations in /back, and sync front to public_html/front';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $frontPath = realpath(base_path(config('deploy.front_path')));

        if ($frontPath === false || ! is_dir($frontPath)) {
            $this->error('Front path not found. Set DEPLOY_FRONT_PATH or ensure ../front exists relative to /back.');

            return self::FAILURE;
        }

        if (! $this->option('skip-remote') && $this->migrateOptionConflict()) {
            $this->error('Use only one of: --migrate, --migrate-fresh, --migrate-seed, --migrate-fresh-seed');

            return self::FAILURE;
        }

        if (! $this->option('skip-build')) {
            $this->info('Running npm run build in '.$frontPath.'...');

            $build = Process::path($frontPath)
                ->timeout(600)
                ->run('npm run build');

            if (! $build->successful()) {
                $this->error($build->errorOutput() ?: $build->output());

                return self::FAILURE;
            }

            $this->line(trim($build->output()));

            $distPath = $frontPath.DIRECTORY_SEPARATOR.'dist';

            if (! is_dir($distPath)) {
                $this->error('Expected build output at '.$distPath.' was not found.');

                return self::FAILURE;
            }

            $this->info('Merging dist/ into front root (rsync)...');

            $merge = Process::path($frontPath)
                ->timeout(300)
                ->run(['rsync', '-a', 'dist'.DIRECTORY_SEPARATOR, '.'.DIRECTORY_SEPARATOR]);

            if (! $merge->successful()) {
                $this->error($merge->errorOutput() ?: $merge->output());

                return self::FAILURE;
            }
        }

        if (! $this->option('skip-build') && ! $this->option('skip-push')) {
            $pushResult = $this->pushFrontToGitHub($frontPath);

            if ($pushResult !== self::SUCCESS) {
                return $pushResult;
            }
        } elseif ($this->option('skip-push') && ! $this->option('skip-build')) {
            $this->comment('Skipped git push (--skip-push).');
        }

        if ($this->option('skip-remote')) {
            $this->comment('Skipped remote steps (--skip-remote).');

            return self::SUCCESS;
        }

        $sshArgs = $this->buildSshArguments();
        $remoteScript = $this->buildRemoteScript();

        if ($this->option('dry-run')) {
            $this->line('Would run (SSH):');
            $quoted = array_map(static fn (string $part): string => escapeshellarg($part), $sshArgs);
            $this->line(implode(' ', $quoted).' '.escapeshellarg($remoteScript));

            return self::SUCCESS;
        }

        $this->info('Connecting via SSH and updating server...');

        $ssh = new SymfonyProcess(
            array_merge($sshArgs, [$remoteScript]),
            null,
            null,
            null,
            600.0
        );

        $ssh->run(function (string $type, string $buffer): void {
            echo $buffer;
        });

        if (! $ssh->isSuccessful()) {
            $this->newLine();
            $this->error('Remote command failed.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Done.');

        return self::SUCCESS;
    }

    /**
     * @return array<int, string>
     */
    private function buildSshArguments(): array
    {
        $key = $this->expandPath((string) config('deploy.ssh.key'));
        $port = (int) config('deploy.ssh.port');
        $user = (string) config('deploy.ssh.user');
        $host = (string) config('deploy.ssh.host');

        return [
            'ssh',
            '-i',
            $key,
            '-p',
            (string) $port,
            $user.'@'.$host,
        ];
    }

    private function buildRemoteScript(): string
    {
        $repo = (string) config('deploy.remote.repo_dir');
        $publicFront = (string) config('deploy.remote.public_front');
        $delete = $this->option('remote-delete') ? ' --delete' : '';
        $backPath = $this->remoteBackPath($repo);
        $php = (string) config('deploy.remote.php_binary');

        $parts = [
            'set -e',
            'cd '.$repo.' && git pull',
        ];

        $artisan = $this->remoteMigrateArtisanArgs();

        if ($artisan !== null) {
            $seed = $artisan['seed'] ? ' --seed' : '';
            if ($artisan['fresh']) {
                $parts[] = 'cd '.$backPath.' && '.$php.' artisan migrate:fresh --force'.$seed;
            } else {
                $parts[] = 'cd '.$backPath.' && '.$php.' artisan migrate --force'.$seed;
            }
        }

        $parts[] = 'mkdir -p '.$publicFront;
        $parts[] = 'rsync -a'.$delete.' '.$repo.'/front/ '.$publicFront.'/';

        return implode(' && ', $parts);
    }

    /**
     * @return array{fresh: bool, seed: bool}|null
     */
    private function remoteMigrateArtisanArgs(): ?array
    {
        if ($this->option('migrate-fresh-seed')) {
            return ['fresh' => true, 'seed' => true];
        }

        if ($this->option('migrate-seed')) {
            return ['fresh' => false, 'seed' => true];
        }

        if ($this->option('migrate-fresh')) {
            return ['fresh' => true, 'seed' => false];
        }

        if ($this->option('migrate')) {
            return ['fresh' => false, 'seed' => false];
        }

        return null;
    }

    private function migrateOptionConflict(): bool
    {
        $count = 0;

        if ($this->option('migrate')) {
            $count++;
        }

        if ($this->option('migrate-fresh')) {
            $count++;
        }

        if ($this->option('migrate-seed')) {
            $count++;
        }

        if ($this->option('migrate-fresh-seed')) {
            $count++;
        }

        return $count > 1;
    }

    private function remoteBackPath(string $repo): string
    {
        $configured = config('deploy.remote.back_path');

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return rtrim($repo, '/').'/back';
    }

    private function expandPath(string $path): string
    {
        if ($path === '' || $path[0] !== '~') {
            return $path;
        }

        $home = getenv('HOME') ?: getenv('USERPROFILE') ?: '';

        return $home === '' ? $path : $home.substr($path, 1);
    }

    /**
     * Stage `front/`, commit if there are changes, and push to the configured remote.
     */
    private function pushFrontToGitHub(string $frontPath): int
    {
        $repoRoot = dirname($frontPath);

        if (! is_dir($repoRoot.DIRECTORY_SEPARATOR.'.git')) {
            $this->error('No Git repository found at '.$repoRoot.' (expected .git next to /front).');

            return self::FAILURE;
        }

        $remote = (string) config('deploy.git.remote');
        $message = (string) ($this->option('message') ?: config('deploy.git.commit_message'));

        if ($this->option('dry-run')) {
            $this->line('Would run (Git, from '.$repoRoot.'):');
            $this->line('  git add front/');
            $this->line('  git diff --cached --quiet || git commit -m '.escapeshellarg($message));
            $this->line('  git push '.$remote.' HEAD');

            return self::SUCCESS;
        }

        $this->info('Staging front/ for commit...');

        $add = Process::path($repoRoot)
            ->timeout(120)
            ->run(['git', 'add', 'front/']);

        if (! $add->successful()) {
            $this->error($add->errorOutput() ?: $add->output());

            return self::FAILURE;
        }

        $diff = Process::path($repoRoot)
            ->run(['git', 'diff', '--cached', '--quiet']);

        if ($diff->successful()) {
            $this->comment('No changes under front/ to commit; skipping commit and push.');

            return self::SUCCESS;
        }

        $this->info('Committing...');

        $commit = Process::path($repoRoot)
            ->timeout(120)
            ->run(['git', 'commit', '-m', $message]);

        if (! $commit->successful()) {
            $this->error($commit->errorOutput() ?: $commit->output());

            return self::FAILURE;
        }

        $this->line(trim($commit->output()));

        $this->info('Pushing to '.$remote.'...');

        $push = Process::path($repoRoot)
            ->timeout(300)
            ->run(['git', 'push', $remote, 'HEAD']);

        if (! $push->successful()) {
            $this->error($push->errorOutput() ?: $push->output());

            return self::FAILURE;
        }

        $this->line(trim($push->output()));

        return self::SUCCESS;
    }
}
