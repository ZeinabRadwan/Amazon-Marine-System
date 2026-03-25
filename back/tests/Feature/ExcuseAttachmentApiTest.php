<?php

namespace Tests\Feature;

use App\Models\Excuse;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExcuseAttachmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_download_own_excuse_attachment(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        Storage::fake('excuses');
        Storage::disk('excuses')->put('2026/03/doc.pdf', 'fake-pdf');

        /** @var User $user */
        $user = User::factory()->create();
        $excuse = Excuse::query()->create([
            'user_id' => $user->id,
            'date' => '2026-03-20',
            'reason' => 'Test',
            'attachment_path' => '2026/03/doc.pdf',
            'status' => Excuse::STATUS_PENDING,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->get('/api/v1/attendance/excuses/'.$excuse->id.'/attachment', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $response->assertHeader('content-disposition');
    }

    public function test_other_user_cannot_download_someone_elses_excuse_attachment(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        Storage::fake('excuses');
        Storage::disk('excuses')->put('2026/03/doc.pdf', 'fake-pdf');

        /** @var User $owner */
        $owner = User::factory()->create();
        /** @var User $other */
        $other = User::factory()->create();

        $excuse = Excuse::query()->create([
            'user_id' => $owner->id,
            'date' => '2026-03-20',
            'reason' => 'Test',
            'attachment_path' => '2026/03/doc.pdf',
            'status' => Excuse::STATUS_PENDING,
        ]);

        $token = $other->createToken('test')->plainTextToken;

        $response = $this->get('/api/v1/attendance/excuses/'.$excuse->id.'/attachment', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertForbidden();
    }

    public function test_attendance_admin_can_download_another_users_excuse_attachment(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        Storage::fake('excuses');
        Storage::disk('excuses')->put('2026/03/doc.pdf', 'fake-pdf');

        /** @var User $owner */
        $owner = User::factory()->create();
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $excuse = Excuse::query()->create([
            'user_id' => $owner->id,
            'date' => '2026-03-20',
            'reason' => 'Test',
            'attachment_path' => '2026/03/doc.pdf',
            'status' => Excuse::STATUS_PENDING,
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->get('/api/v1/attendance/excuses/'.$excuse->id.'/attachment', [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $response->assertHeader('content-disposition');
    }
}
