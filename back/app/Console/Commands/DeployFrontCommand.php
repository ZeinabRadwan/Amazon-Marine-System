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
                            {--dry-run : Print remote SSH command without executing}
                            {--skip-build : Skip local npm run build and dist merge}
                            {--skip-remote : Skip SSH (git pull + public_html sync)}
                            {--remote-delete : Pass --delete to remote rsync (remove files in public_html/front not in source)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Build the front app, merge dist into the front root, then SSH to pull the repo and sync front to public_html/front';

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

        if ($this->option('skip-remote')) {
            $this->comment('Skipped remote steps (--skip-remote).');

            return self::SUCCESS;
        }

        $sshArgs = $this->buildSshArguments();
        $remoteScript = $this->buildRemoteScript();

        if ($this->option('dry-run')) {
            $this->line('Would run:');
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

        return 'set -e; cd '.$repo.' && git pull && mkdir -p '.$publicFront.' && rsync -a'.$delete.' '.$repo.'/front/ '.$publicFront.'/';
    }

    private function expandPath(string $path): string
    {
        if ($path === '' || $path[0] !== '~') {
            return $path;
        }

        $home = getenv('HOME') ?: getenv('USERPROFILE') ?: '';

        return $home === '' ? $path : $home.substr($path, 1);
    }
}
