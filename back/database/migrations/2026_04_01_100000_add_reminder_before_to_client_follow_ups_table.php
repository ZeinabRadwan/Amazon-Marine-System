<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->unsignedInteger('reminder_before_value')->nullable()->after('reminder_at');
            $table->string('reminder_before_unit', 16)->nullable()->after('reminder_before_value');
        });
    }

    public function down(): void
    {
        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->dropColumn(['reminder_before_value', 'reminder_before_unit']);
        });
    }
};
