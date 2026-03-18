<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('communication_logs', function (Blueprint $table) {
            $table->foreignId('communication_log_type_id')->nullable()->after('ticket_id')->constrained('communication_log_types')->nullOnDelete();
        });

        Schema::table('communication_logs', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }

    public function down(): void
    {
        Schema::table('communication_logs', function (Blueprint $table) {
            $table->string('type', 50)->nullable();
        });

        Schema::table('communication_logs', function (Blueprint $table) {
            $table->dropForeign(['communication_log_type_id']);
        });
    }
};
