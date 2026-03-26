<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table): void {
            $table->string('name_ar')->nullable()->after('name');
            $table->string('name_en')->nullable()->after('name_ar');
        });

        Schema::table('page_permissions', function (Blueprint $table): void {
            $table->dropColumn(['can_edit', 'can_delete', 'can_approve']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('page_permissions', function (Blueprint $table): void {
            $table->boolean('can_edit')->default(false)->after('can_view');
            $table->boolean('can_delete')->default(false)->after('can_edit');
            $table->boolean('can_approve')->default(false)->after('can_delete');
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->dropColumn(['name_ar', 'name_en']);
        });
    }
};
