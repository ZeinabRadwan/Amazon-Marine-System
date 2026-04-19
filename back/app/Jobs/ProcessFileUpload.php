<?php

namespace App\Jobs;

use App\Services\FileService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Http\UploadedFile;
use Illuminate\Database\Eloquent\Model;

class ProcessFileUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected string $filePath,
        protected string $collection,
        protected ?string $diskName,
        protected ?Model $owner,
        protected string $originalName,
        protected string $mimeType,
        protected int $size
    ) {}

    /**
     * Execute the job.
     */
    public function handle(FileService $fileService): void
    {
        // Reconstruct an UploadedFile-like object or use the raw file path
        // Note: Real jobs usually handle temporary files differently.
        // This is a template for the user to refine based on their queue driver.
        
        $file = new \Illuminate\Http\File($this->filePath);
        
        $fileService->uploadRaw(
            file: $file,
            collection: $this->collection,
            diskName: $this->diskName,
            owner: $this->owner,
            originalName: $this->originalName,
            mimeType: $this->mimeType,
            size: $this->size
        );

        // Cleanup temp file
        @unlink($this->filePath);
    }
}
