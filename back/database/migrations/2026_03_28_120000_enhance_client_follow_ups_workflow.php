<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->string('channel', 32)->nullable()->after('client_id');
            $table->string('followup_type', 40)->nullable()->after('channel');
            $table->string('outcome', 40)->nullable()->after('followup_type');
            $table->timestamp('reminder_at')->nullable()->after('summary');
            $table->dateTime('next_follow_up_at_new')->nullable()->after('next_follow_up_at');
        });

        foreach (DB::table('client_follow_ups')->cursor() as $row) {
            DB::table('client_follow_ups')->where('id', $row->id)->update([
                'channel' => $row->type ?? 'phone',
            ]);
        }

        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        foreach (DB::table('client_follow_ups')->cursor() as $row) {
            $next = null;
            if (! empty($row->next_follow_up_at)) {
                try {
                    $next = Carbon::parse($row->next_follow_up_at)->format('Y-m-d H:i:s');
                } catch (\Throwable) {
                    $next = null;
                }
            }
            DB::table('client_follow_ups')->where('id', $row->id)->update([
                'next_follow_up_at_new' => $next,
            ]);
        }

        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->dropColumn('next_follow_up_at');
        });

        Schema::table('client_follow_ups', function (Blueprint $table) {
            $table->renameColumn('next_follow_up_at_new', 'next_follow_up_at');
        });
    }

    public function down(): void
    {
        throw new \RuntimeException('Rolling back enhance_client_follow_ups_workflow is not supported.');
    }
};
