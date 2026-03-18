<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SettingsSessionsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_requires_authentication(): void
    {
        $this->getJson('/api/v1/settings')->assertStatus(401);
    }

    public function test_settings_show_works_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/settings')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'company' => ['profile', 'location'],
                    'system' => ['preferences'],
                    'notifications' => ['preferences'],
                    'sessions' => ['reset_hour', 'idle_logout_minutes'],
                ],
            ]);
    }

    public function test_company_location_can_be_saved_by_admin(): void
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin, 'sanctum')->putJson('/api/v1/settings/company/location', [
            'lat' => 31.2001,
            'lng' => 29.9187,
            'radius_m' => 250,
        ])->assertStatus(200)
            ->assertJsonPath('data.company.location.lat', 31.2001)
            ->assertJsonPath('data.company.location.lng', 29.9187)
            ->assertJsonPath('data.company.location.radius_m', 250);
    }

    public function test_sessions_today_and_history_endpoints_work(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/sessions/today')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'session_date',
                    'user_id',
                    'user_name',
                    'first_seen_at',
                    'last_seen_at',
                    'total_active_seconds',
                    'total_active_minutes',
                ],
            ]);

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/sessions/history')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [],
            ]);
    }

    public function test_idle_logout_deletes_token_and_returns_401(): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['key' => 'sessions.reset_hour'],
            ['value' => json_encode(0), 'created_at' => now(), 'updated_at' => now()]
        );
        DB::table('app_settings')->updateOrInsert(
            ['key' => 'sessions.idle_logout_minutes'],
            ['value' => json_encode(1), 'created_at' => now(), 'updated_at' => now()]
        );

        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        DB::table('user_daily_sessions')->insert([
            'user_id' => $user->id,
            'session_date' => now()->toDateString(),
            'first_seen_at' => now()->subMinutes(10),
            'last_seen_at' => now()->subMinutes(5),
            'total_active_seconds' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/v1/settings')
            ->assertStatus(401);
    }
}
