<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->string('noteable_type');
            $table->unsignedBigInteger('noteable_id');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('content')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->timestamps();
            $table->index(['noteable_type', 'noteable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
