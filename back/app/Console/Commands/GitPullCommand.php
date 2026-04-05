<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;

class GitPullCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'git:pull {--dry-run : Print the git pull command without executing it}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run git pull from the repository root';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $repoRoot = realpath(base_path('..'));

        if ($repoRoot === false || ! is_dir($repoRoot.DIRECTORY_SEPARATOR.'.git')) {
            $this->error('Unable to locate Git repository root (expected .git one level above /back).');

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->line('Would run (from '.$repoRoot.'):');
            $this->line('  git pull');

            return self::SUCCESS;
        }

        $this->info('Running git pull from '.$repoRoot.'...');

        $result = Process::path($repoRoot)
            ->timeout(300)
            ->run(['git', 'pull']);

        if (! $result->successful()) {
            $this->error($result->errorOutput() ?: $result->output());

            return self::FAILURE;
        }

        $this->line(trim($result->output()));

        return self::SUCCESS;
    }
}
