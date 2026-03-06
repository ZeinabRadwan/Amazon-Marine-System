<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table): void {
            $table->string('contact_name')->nullable()->after('name');
            $table->string('company_name')->nullable()->after('contact_name');
            $table->string('company_type', 50)->nullable()->after('type');
            $table->string('business_activity')->nullable()->after('company_type');
            $table->string('target_markets')->nullable()->after('business_activity');
            $table->string('preferred_comm_method', 50)->nullable()->after('phone');
            $table->string('website_url')->nullable()->after('address');
            $table->string('facebook_url')->nullable()->after('website_url');
            $table->string('linkedin_url')->nullable()->after('facebook_url');

            $table->string('status', 20)->default('new')->after('linkedin_url');
            $table->string('lead_source')->nullable()->after('status');
            $table->string('lead_source_other')->nullable()->after('lead_source');
            $table->string('interest_level', 20)->nullable()->after('lead_source_other');

            $table->string('decision_maker_name')->nullable()->after('interest_level');
            $table->string('decision_maker_title')->nullable()->after('decision_maker_name');
            $table->string('decision_maker_title_other')->nullable()->after('decision_maker_title');

            $table->text('shipping_problems')->nullable()->after('notes');
            $table->text('current_need')->nullable()->after('shipping_problems');
            $table->text('pain_points')->nullable()->after('current_need');
            $table->text('opportunity')->nullable()->after('pain_points');
            $table->text('special_requirements')->nullable()->after('opportunity');

            $table->unsignedInteger('shipments_count')->default(0)->after('special_requirements');
            $table->decimal('total_profit', 12, 2)->default(0)->after('shipments_count');
            $table->timestamp('last_contact_at')->nullable()->after('total_profit');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table): void {
            $table->dropColumn([
                'contact_name',
                'company_name',
                'company_type',
                'business_activity',
                'target_markets',
                'preferred_comm_method',
                'website_url',
                'facebook_url',
                'linkedin_url',
                'status',
                'lead_source',
                'lead_source_other',
                'interest_level',
                'decision_maker_name',
                'decision_maker_title',
                'decision_maker_title_other',
                'shipping_problems',
                'current_need',
                'pain_points',
                'opportunity',
                'special_requirements',
                'shipments_count',
                'total_profit',
                'last_contact_at',
            ]);
        });
    }
};

