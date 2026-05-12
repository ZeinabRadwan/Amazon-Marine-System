<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipment_operation_tasks', function (Blueprint $table) {
            $table->dateTime('execution_at')->nullable()->after('due_date');
            $table->string('priority', 20)->default('medium')->after('execution_at');
            $table->dateTime('reminder_at')->nullable()->after('priority');
            $table->unsignedInteger('reminder_before_value')->nullable()->after('reminder_at');
            $table->string('reminder_before_unit', 20)->nullable()->after('reminder_before_value');
        });
    }

    public function down(): void
    {
        Schema::table('shipment_operation_tasks', function (Blueprint $table) {
            $table->dropColumn([
                'execution_at',
                'priority',
                'reminder_at',
                'reminder_before_value',
                'reminder_before_unit',
            ]);
        });
    }
};
