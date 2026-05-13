<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Track operations team's booking decision (confirm/cancel) on an SD form.
     */
    public function up(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table): void {
            $table->text('booking_cancellation_reason')->nullable()->after('notes');
            $table->timestamp('booking_confirmed_at')->nullable()->after('booking_cancellation_reason');
            $table->timestamp('booking_cancelled_at')->nullable()->after('booking_confirmed_at');
            $table->foreignId('booking_decided_by_user_id')
                ->nullable()
                ->after('booking_cancelled_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('booking_decided_by_user_id');
            $table->dropColumn(['booking_cancellation_reason', 'booking_confirmed_at', 'booking_cancelled_at']);
        });
    }
};
