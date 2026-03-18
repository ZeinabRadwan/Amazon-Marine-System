<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShipmentStatusApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_shipment_status_crud_requires_authorization(): void
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/shipment-statuses', [
            'name_ar' => 'تم الحجز',
            'color' => '#3B82F6',
        ])->assertStatus(403);
    }

    public function test_admin_can_create_and_list_shipment_statuses(): void
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin, 'sanctum')->postJson('/api/v1/shipment-statuses', [
            'name_ar' => 'تم الحجز',
            'name_en' => 'Booked',
            'color' => '#3B82F6',
            'description' => 'اختبار',
            'active' => true,
            'sort_order' => 10,
        ])->assertStatus(201)
            ->assertJsonPath('data.name_ar', 'تم الحجز');

        $this->actingAs($admin, 'sanctum')->getJson('/api/v1/shipment-statuses')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }
}
