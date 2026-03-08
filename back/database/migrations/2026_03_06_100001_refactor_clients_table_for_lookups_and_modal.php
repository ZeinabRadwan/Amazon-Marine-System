<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $fkColumns = [
            'company_type_id' => 'company_name',
            'preferred_comm_method_id' => 'phone',
            'interest_level_id' => 'lead_source_other',
            'decision_maker_title_id' => 'decision_maker_name',
            'lead_source_id' => 'linkedin_url',
        ];
        foreach ($fkColumns as $col => $after) {
            if (! Schema::hasColumn('clients', $col)) {
                Schema::table('clients', function (Blueprint $table) use ($col, $after) {
                    $table->unsignedBigInteger($col)->nullable()->after($after);
                });
            }
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->foreign('company_type_id')->references('id')->on('company_types')->nullOnDelete();
            $table->foreign('preferred_comm_method_id')->references('id')->on('preferred_comm_methods')->nullOnDelete();
            $table->foreign('interest_level_id')->references('id')->on('interest_levels')->nullOnDelete();
            $table->foreign('decision_maker_title_id')->references('id')->on('decision_maker_titles')->nullOnDelete();
            $table->foreign('lead_source_id')->references('id')->on('lead_sources')->nullOnDelete();
        });

        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'code')) {
                $table->dropUnique(['code']);
                $table->dropColumn('code');
            }
        });

        Schema::table('clients', function (Blueprint $table) {
            $columnsToDrop = [
                'contact_name',
                'type',
                'company_type',
                'preferred_comm_method',
                'status',
                'lead_source',
                'interest_level',
                'decision_maker_title',
                'city',
                'country',
                'default_payment_terms',
                'default_currency',
            ];
            foreach ($columnsToDrop as $col) {
                if (Schema::hasColumn('clients', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['company_type_id']);
            $table->dropForeign(['preferred_comm_method_id']);
            $table->dropForeign(['interest_level_id']);
            $table->dropForeign(['decision_maker_title_id']);
            $table->dropForeign(['lead_source_id']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'company_type_id',
                'preferred_comm_method_id',
                'interest_level_id',
                'decision_maker_title_id',
                'lead_source_id',
            ]);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('contact_name')->nullable()->after('name');
            $table->string('code')->nullable()->after('name');
            $table->string('type', 20)->default('company')->after('code');
            $table->string('company_type', 50)->nullable()->after('type');
            $table->string('preferred_comm_method', 50)->nullable()->after('phone');
            $table->string('city')->nullable()->after('address');
            $table->string('country')->nullable()->after('city');
            $table->string('default_payment_terms')->nullable()->after('address');
            $table->string('default_currency', 3)->nullable()->after('default_payment_terms');
            $table->string('status', 20)->default('new')->after('linkedin_url');
            $table->string('lead_source')->nullable()->after('status');
            $table->string('interest_level', 20)->nullable()->after('lead_source_other');
            $table->string('decision_maker_title')->nullable()->after('decision_maker_name');
        });
    }
};
