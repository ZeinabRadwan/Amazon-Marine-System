<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('excuses');
    }

    public function down(): void
    {
        Schema::create('excuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('reason');
            $table->string('status', 20)->default('pending');
            $table->string('attachment_path')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });
    }
};
