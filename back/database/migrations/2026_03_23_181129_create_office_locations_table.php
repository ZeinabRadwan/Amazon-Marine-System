<?php

use App\Models\AppSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('office_locations', function (Blueprint $table) {
            $table->id();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->unsignedInteger('radius_meters')->nullable();
            $table->timestamps();
        });

        $row = AppSetting::query()->where('key', 'company.location')->first();
        $value = $row?->value;
        if (is_array($value) && isset($value['lat'], $value['lng'])) {
            DB::table('office_locations')->insert([
                'id' => 1,
                'lat' => (float) $value['lat'],
                'lng' => (float) $value['lng'],
                'radius_meters' => isset($value['radius_m']) && $value['radius_m'] !== null
                    ? (int) $value['radius_m']
                    : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('office_locations');
    }
};
