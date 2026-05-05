<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table): void {
            if (! Schema::hasColumn('invoice_items', 'title')) {
                $table->string('title')->nullable()->after('description');
            }
            if (! Schema::hasColumn('invoice_items', 'currency_code')) {
                $table->string('currency_code', 10)->default('USD')->after('line_total');
            }
            if (! Schema::hasColumn('invoice_items', 'section_key')) {
                $table->string('section_key', 60)->nullable()->after('currency_code');
            }
            if (! Schema::hasColumn('invoice_items', 'order_index')) {
                $table->unsignedInteger('order_index')->default(0)->after('section_key');
            }
            if (! Schema::hasColumn('invoice_items', 'source_key')) {
                $table->string('source_key', 150)->nullable()->after('order_index');
            }
            if (! Schema::hasColumn('invoice_items', 'cost_unit_price')) {
                $table->decimal('cost_unit_price', 14, 2)->default(0)->after('source_key');
            }
            if (! Schema::hasColumn('invoice_items', 'cost_line_total')) {
                $table->decimal('cost_line_total', 14, 2)->default(0)->after('cost_unit_price');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table): void {
            foreach ([
                'title',
                'currency_code',
                'section_key',
                'order_index',
                'source_key',
                'cost_unit_price',
                'cost_line_total',
            ] as $column) {
                if (Schema::hasColumn('invoice_items', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

