<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->string('visitable_type')->nullable()->after('id');
            $table->unsignedBigInteger('visitable_id')->nullable()->after('visitable_type');
        });

        DB::table('visits')->update([
            'visitable_type' => 'App\Models\Client',
            'visitable_id' => DB::raw('client_id'),
        ]);

        Schema::table('visits', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropColumn('client_id');
            $table->index(['visitable_type', 'visitable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex(['visitable_type', 'visitable_id']);
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('id')->constrained('clients')->cascadeOnDelete();
        });

        DB::table('visits')
            ->where('visitable_type', 'App\Models\Client')
            ->update(['client_id' => DB::raw('visitable_id')]);

        Schema::table('visits', function (Blueprint $table) {
            $table->dropColumn(['visitable_type', 'visitable_id']);
        });
    }
};
