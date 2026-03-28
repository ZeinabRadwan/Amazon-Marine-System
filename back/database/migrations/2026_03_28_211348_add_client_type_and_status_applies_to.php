<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_statuses', function (Blueprint $table) {
            $table->string('applies_to', 20)->default('client')->after('sort_order');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('client_type', 20)->default('client')->after('linkedin_url');
        });

        Schema::disableForeignKeyConstraints();
        try {
            DB::table('clients')->update(['status_id' => null]);
            DB::table('client_statuses')->delete();

            $now = now();
            $rows = [
                ['name_en' => 'Prospect', 'name_ar' => 'عميل محتمل', 'sort_order' => 1, 'applies_to' => 'lead'],
                ['name_en' => 'Contacted', 'name_ar' => 'تم التواصل', 'sort_order' => 2, 'applies_to' => 'lead'],
                ['name_en' => 'Interested', 'name_ar' => 'مهتم', 'sort_order' => 3, 'applies_to' => 'lead'],
                ['name_en' => 'Quotation', 'name_ar' => 'عرض سعر', 'sort_order' => 4, 'applies_to' => 'lead'],
                ['name_en' => 'Negotiation', 'name_ar' => 'تفاوض', 'sort_order' => 5, 'applies_to' => 'lead'],
                ['name_en' => 'Expected', 'name_ar' => 'عميل متوقع', 'sort_order' => 6, 'applies_to' => 'lead'],
                ['name_en' => 'Lost lead', 'name_ar' => 'مفقود', 'sort_order' => 7, 'applies_to' => 'lead'],
                ['name_en' => 'New', 'name_ar' => 'جديد', 'sort_order' => 1, 'applies_to' => 'client'],
                ['name_en' => 'Active', 'name_ar' => 'نشط', 'sort_order' => 2, 'applies_to' => 'client'],
                ['name_en' => 'Recurring', 'name_ar' => 'متكرر', 'sort_order' => 3, 'applies_to' => 'client'],
                ['name_en' => 'In progress', 'name_ar' => 'قيد التنفيذ', 'sort_order' => 4, 'applies_to' => 'client'],
                ['name_en' => 'On hold', 'name_ar' => 'متوقف', 'sort_order' => 5, 'applies_to' => 'client'],
                ['name_en' => 'Inactive', 'name_ar' => 'غير نشط', 'sort_order' => 6, 'applies_to' => 'client'],
                ['name_en' => 'Lost client', 'name_ar' => 'مفقود', 'sort_order' => 7, 'applies_to' => 'client'],
            ];

            foreach ($rows as $row) {
                DB::table('client_statuses')->insert([
                    'name_en' => $row['name_en'],
                    'name_ar' => $row['name_ar'],
                    'sort_order' => $row['sort_order'],
                    'applies_to' => $row['applies_to'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('clients')->update(['client_type' => 'client']);
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('client_type');
        });

        Schema::table('client_statuses', function (Blueprint $table) {
            $table->dropColumn('applies_to');
        });
    }
};
