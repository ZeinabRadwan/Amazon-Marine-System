<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_offer_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pricing_offer_id')->constrained('pricing_offers')->cascadeOnDelete();
            $table->json('snapshot_data');
            $table->timestamps();

            $table->index(['pricing_offer_id']);
        });

        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->foreignId('origin_rate_snapshot_id')
                ->nullable()
                ->after('pricing_offer_id')
                ->constrained('pricing_offer_snapshots')
                ->nullOnDelete();

            $table->index(['origin_rate_snapshot_id']);
        });
    }

    public function down(): void
    {
        Schema::table('pricing_quotes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('origin_rate_snapshot_id');
        });

        Schema::dropIfExists('pricing_offer_snapshots');
    }
};

