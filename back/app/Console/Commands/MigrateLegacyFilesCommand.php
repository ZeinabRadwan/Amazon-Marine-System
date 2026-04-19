<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\ClientAttachment;
use App\Models\Document;
use App\Models\Excuse;
use App\Models\Expense;
use App\Models\FileRecord;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MigrateLegacyFilesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'files:migrate-legacy {--dry-run : Only show what would be done}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate legacy file paths to the new FileRecord system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        $this->info('Starting legacy file migration...');

        $this->migrateClientAttachments($dryRun);
        $this->migrateDocuments($dryRun);
        $this->migrateExcuses($dryRun);
        $this->migrateExpenses($dryRun);

        $this->info('Migration completed!');
    }

    private function migrateClientAttachments(bool $dryRun)
    {
        $attachments = ClientAttachment::all();
        $this->info("Found {$attachments->count()} legacy client attachments.");

        foreach ($attachments as $attachment) {
            $exists = FileRecord::where('fileable_type', Client::class)
                ->where('fileable_id', $attachment->client_id)
                ->where('original_name', $attachment->name)
                ->exists();

            if ($exists) {
                $this->line("Skipping existing: {$attachment->name}");
                continue;
            }

            if (!$dryRun) {
                FileRecord::create([
                    'disk'          => 'local',
                    'path'          => $attachment->path,
                    'original_name' => $attachment->name,
                    'stored_name'   => basename($attachment->path),
                    'mime_type'     => $attachment->mime_type,
                    'size'          => $attachment->size,
                    'collection'    => 'client_attachments',
                    'fileable_type' => Client::class,
                    'fileable_id'   => $attachment->client_id,
                    'status'        => 'active',
                ]);
            }
            $this->info("Migrated: {$attachment->name}");
        }
    }

    private function migrateDocuments(bool $dryRun)
    {
        $docs = Document::whereNotNull('path')->get();
        $this->info("Found {$docs->count()} legacy documents.");

        foreach ($docs as $doc) {
            $exists = $doc->files()->exists();
            if ($exists) continue;

            if (!$dryRun) {
                FileRecord::create([
                    'disk'          => 'local',
                    'path'          => $doc->path,
                    'original_name' => $doc->name,
                    'stored_name'   => basename($doc->path),
                    'mime_type'     => $doc->mime_type ?? 'application/octet-stream',
                    'size'          => $doc->size ?? 0,
                    'collection'    => 'documents',
                    'fileable_type' => Document::class,
                    'fileable_id'   => $doc->id,
                    'status'        => 'active',
                ]);
            }
            $this->info("Migrated Document: {$doc->name}");
        }
    }

    private function migrateExcuses(bool $dryRun)
    {
        $excuses = Excuse::whereNotNull('attachment_path')->get();
        $this->info("Found {$excuses->count()} legacy excuses.");

        foreach ($excuses as $excuse) {
            $exists = $excuse->files()->exists();
            if ($exists) continue;

            if (!$dryRun) {
                FileRecord::create([
                    'disk'          => 'excuses', // Legacy disk name
                    'path'          => $excuse->attachment_path,
                    'original_name' => basename($excuse->attachment_path),
                    'stored_name'   => basename($excuse->attachment_path),
                    'mime_type'     => 'application/octet-stream',
                    'size'          => 0,
                    'collection'    => 'excuses',
                    'fileable_type' => Excuse::class,
                    'fileable_id'   => $excuse->id,
                    'status'        => 'active',
                ]);
            }
            $this->info("Migrated Excuse: {$excuse->id}");
        }
    }

    private function migrateExpenses(bool $dryRun)
    {
        $expenses = Expense::whereNotNull('receipt_path')->get();
        $this->info("Found {$expenses->count()} legacy expenses.");

        foreach ($expenses as $expense) {
            $exists = $expense->files()->exists();
            if ($exists) continue;

            if (!$dryRun) {
                FileRecord::create([
                    'disk'          => 'local',
                    'path'          => $expense->receipt_path,
                    'original_name' => basename($expense->receipt_path),
                    'stored_name'   => basename($expense->receipt_path),
                    'mime_type'     => 'application/octet-stream',
                    'size'          => 0,
                    'collection'    => 'receipts',
                    'fileable_type' => Expense::class,
                    'fileable_id'   => $expense->id,
                    'status'        => 'active',
                ]);
            }
            $this->info("Migrated Expense: {$expense->id}");
        }
    }
}
