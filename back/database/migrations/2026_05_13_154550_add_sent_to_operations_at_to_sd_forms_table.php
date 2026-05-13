<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Track when an SD form first entered the Operations workflow.
     *
     * Once this timestamp is set the form must remain permanently visible to operations
     * regardless of subsequent status changes (booking_confirmed, booking_cancelled,
     * converted_to_shipment, etc.). This decouples operations visibility from the
     * current status and preserves full workflow history.
     */
    public function up(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table): void {
            $table->timestamp('sent_to_operations_at')->nullable()->after('booking_decided_by_user_id');
        });

        // Backfill: any form that has already reached an operations-stage status is treated
        // as having been sent to operations at its last update time.
        DB::table('s_d_forms')
            ->whereIn('status', [
                'sent_to_operations',
                'in_progress',
                'booking_confirmed',
                'booking_cancelled',
                'converted_to_shipment',
                'completed',
            ])
            ->whereNull('sent_to_operations_at')
            ->update(['sent_to_operations_at' => DB::raw('COALESCE(updated_at, created_at)')]);
    }

    public function down(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table): void {
            $table->dropColumn('sent_to_operations_at');
        });
    }
};
