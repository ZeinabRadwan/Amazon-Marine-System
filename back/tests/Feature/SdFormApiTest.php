<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SdFormApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_sd_form(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create([
            'email' => 'sales@example.com',
            'password' => 'password',
        ]);
        $user->assignRole('sales');

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/sd-forms', [
            'shipment_direction' => 'Export',
        ], [
            'Authorization' => 'Bearer ' . $token,
        ]);

        $response->assertStatus(201);
    }
}

