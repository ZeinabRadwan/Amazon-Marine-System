<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_daily_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('session_date');
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->unsignedBigInteger('total_active_seconds')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'session_date']);
            $table->index(['session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_daily_sessions');
    }
};
