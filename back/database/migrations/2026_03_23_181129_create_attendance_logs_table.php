<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20);
            $table->dateTime('attempted_at');
            $table->string('device_type', 20);
            $table->string('ip_address', 45)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('distance_from_office', 12, 2)->nullable();
            $table->boolean('is_within_radius')->nullable();
            $table->boolean('accepted')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'attempted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
