<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_defaults_to_current_user(): void
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/activities')->assertStatus(200)->assertJson([
            'data' => [],
        ]);
    }

    public function test_admin_can_view_other_user_activities(): void
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/settings')->assertStatus(200);
        ActivityLogger::log('shipment.created', null, ['test' => true]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/v1/activities?user_id='.$user->id)
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    ['id', 'event', 'description', 'log_name', 'subject_type', 'subject_id', 'causer_id', 'properties', 'created_at'],
                ],
            ]);
    }
}
