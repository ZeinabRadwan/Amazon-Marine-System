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
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('ticket_type_id')->nullable()->after('assigned_to_id')->constrained('ticket_types')->nullOnDelete();
            $table->foreignId('priority_id')->nullable()->after('ticket_type_id')->constrained('ticket_priorities')->nullOnDelete();
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['type', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->string('type', 30)->default('inquiry');
            $table->string('priority', 30)->default('medium');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['ticket_type_id']);
            $table->dropForeign(['priority_id']);
        });
    }
};
