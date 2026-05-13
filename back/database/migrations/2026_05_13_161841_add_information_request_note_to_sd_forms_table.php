<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Operations may ask sales/admin to complete missing information for an SD form.
     *
     * - information_request_note: free-text explanation of what is missing.
     * - information_requested_at: timestamp the request was raised.
     */
    public function up(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table): void {
            $table->text('information_request_note')->nullable()->after('booking_cancellation_reason');
            $table->timestamp('information_requested_at')->nullable()->after('information_request_note');
        });
    }

    public function down(): void
    {
        Schema::table('s_d_forms', function (Blueprint $table): void {
            $table->dropColumn(['information_request_note', 'information_requested_at']);
        });
    }
};
