<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_fails_with_invalid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => 'password',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_logout_message_is_arabic_when_accept_language_is_ar(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/auth/logout', [], [
            'Authorization' => 'Bearer '.$token,
            'Accept-Language' => 'ar',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message', 'تم تسجيل الخروج');
    }

    public function test_logout_message_is_arabic_when_x_app_locale_is_ar(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/auth/logout', [], [
            'Authorization' => 'Bearer '.$token,
            'X-App-Locale' => 'ar',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message', 'تم تسجيل الخروج');
    }

    public function test_login_invalid_credentials_message_is_arabic_when_accept_language_is_ar(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => 'password',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ], ['Accept-Language' => 'ar']);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.email.0', 'بيانات تسجيل الدخول غير صحيحة.');
    }
}

