<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->foreignId('pricing_quote_id')
                ->nullable()
                ->after('sd_form_id')
                ->constrained('pricing_quotes')
                ->nullOnDelete();
            $table->string('quotation_reference', 120)->nullable()->after('pricing_quote_id');
            $table->index(['sales_rep_id', 'pricing_quote_id']);
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['pricing_quote_id']);
            $table->dropIndex(['sales_rep_id', 'pricing_quote_id']);
            $table->dropColumn(['pricing_quote_id', 'quotation_reference']);
        });
    }
};
