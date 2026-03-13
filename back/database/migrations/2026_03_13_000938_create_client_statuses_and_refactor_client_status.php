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
        Schema::create('client_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedBigInteger('status_id')->nullable()->after('linkedin_url');
        });

        $statuses = [
            ['name' => 'New', 'sort_order' => 1],
            ['name' => 'Active', 'sort_order' => 2],
            ['name' => 'Inactive', 'sort_order' => 3],
            ['name' => 'Pending', 'sort_order' => 4],
        ];
        foreach ($statuses as $i => $row) {
            DB::table('client_statuses')->insert([
                'name' => $row['name'],
                'sort_order' => $row['sort_order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (Schema::hasColumn('clients', 'status')) {
            $map = [
                'new' => 'New',
                'active' => 'Active',
                'inactive' => 'Inactive',
                'pending' => 'Pending',
            ];
            $statusIds = DB::table('client_statuses')->pluck('id', 'name');
            foreach ($map as $old => $name) {
                $id = $statusIds[$name] ?? null;
                if ($id) {
                    DB::table('clients')->where('status', $old)->update(['status_id' => $id]);
                }
            }
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->foreign('status_id')->references('id')->on('client_statuses')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['status_id']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->string('status', 20)->default('new')->nullable()->after('linkedin_url');
        });

        $statusIds = DB::table('client_statuses')->pluck('name', 'id');
        foreach ($statusIds as $id => $name) {
            DB::table('clients')->where('status_id', $id)->update([
                'status' => strtolower($name),
            ]);
        }

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('status_id');
        });

        Schema::dropIfExists('client_statuses');
    }
};
