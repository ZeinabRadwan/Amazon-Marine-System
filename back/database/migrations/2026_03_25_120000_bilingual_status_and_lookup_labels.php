<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('client_statuses') && Schema::hasColumn('client_statuses', 'name')) {
            Schema::table('client_statuses', function (Blueprint $table) {
                $table->string('name_ar')->nullable()->after('id');
                $table->string('name_en')->nullable()->after('name_ar');
            });

            foreach (DB::table('client_statuses')->cursor() as $row) {
                DB::table('client_statuses')->where('id', $row->id)->update([
                    'name_ar' => $row->name,
                    'name_en' => $row->name,
                ]);
            }

            Schema::table('client_statuses', function (Blueprint $table) {
                $table->dropColumn('name');
            });
        }

        if (Schema::hasTable('ticket_types') && ! Schema::hasColumn('ticket_types', 'label_en')) {
            Schema::table('ticket_types', function (Blueprint $table) {
                $table->string('label_en', 100)->nullable()->after('label_ar');
            });
        }

        if (Schema::hasTable('ticket_priorities') && ! Schema::hasColumn('ticket_priorities', 'label_en')) {
            Schema::table('ticket_priorities', function (Blueprint $table) {
                $table->string('label_en', 100)->nullable()->after('label_ar');
            });
        }

        if (Schema::hasTable('communication_log_types') && ! Schema::hasColumn('communication_log_types', 'label_en')) {
            Schema::table('communication_log_types', function (Blueprint $table) {
                $table->string('label_en', 100)->nullable()->after('label_ar');
            });
        }

        foreach (['ticket_types', 'ticket_priorities', 'communication_log_types'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            foreach (DB::table($tableName)->cursor() as $row) {
                if ($row->label_en !== null && $row->label_en !== '') {
                    continue;
                }
                DB::table($tableName)->where('id', $row->id)->update(['label_en' => $row->name]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('client_statuses') && ! Schema::hasColumn('client_statuses', 'name')) {
            Schema::table('client_statuses', function (Blueprint $table) {
                $table->string('name')->nullable()->after('id');
            });

            foreach (DB::table('client_statuses')->cursor() as $row) {
                DB::table('client_statuses')->where('id', $row->id)->update([
                    'name' => $row->name_en ?? $row->name_ar ?? 'unknown',
                ]);
            }

            Schema::table('client_statuses', function (Blueprint $table) {
                $table->dropColumn(['name_ar', 'name_en']);
            });
        }

        if (Schema::hasTable('ticket_types') && Schema::hasColumn('ticket_types', 'label_en')) {
            Schema::table('ticket_types', function (Blueprint $table) {
                $table->dropColumn('label_en');
            });
        }

        if (Schema::hasTable('ticket_priorities') && Schema::hasColumn('ticket_priorities', 'label_en')) {
            Schema::table('ticket_priorities', function (Blueprint $table) {
                $table->dropColumn('label_en');
            });
        }

        if (Schema::hasTable('communication_log_types') && Schema::hasColumn('communication_log_types', 'label_en')) {
            Schema::table('communication_log_types', function (Blueprint $table) {
                $table->dropColumn('label_en');
            });
        }
    }
};
