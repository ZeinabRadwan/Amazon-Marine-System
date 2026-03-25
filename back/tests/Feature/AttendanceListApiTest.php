<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceListApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_single_day_list_includes_active_users_without_attendance_record(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        /** @var User $viewer */
        $viewer = User::factory()->create(['name' => 'Viewer']);
        $viewer->givePermissionTo('attendance.view');

        /** @var User $noRecord */
        $noRecord = User::factory()->create(['name' => 'No Punch']);

        $date = '2026-03-20';

        AttendanceRecord::query()->create([
            'user_id' => $viewer->id,
            'date' => $date,
            'check_in_at' => '2026-03-20 08:00:00',
            'check_out_at' => null,
            'is_late' => false,
            'status' => AttendanceRecord::STATUS_ON_TIME,
        ]);

        $token = $viewer->createToken('test')->plainTextToken;

        $response = $this->getJson('/api/v1/attendance?from='.$date.'&to='.$date, [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $response->assertJsonCount(2, 'data');

        $rows = collect($response->json('data'));
        $absentRow = $rows->firstWhere('user_id', $noRecord->id);
        $this->assertNotNull($absentRow);
        $this->assertNull($absentRow['check_in_at']);
        $this->assertNull($absentRow['check_out_at']);
        $this->assertNull($absentRow['status']);
    }

    public function test_date_range_does_not_fill_missing_users(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        /** @var User $viewer */
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('attendance.view');

        User::factory()->create();

        $from = '2026-03-20';
        $to = '2026-03-21';

        AttendanceRecord::query()->create([
            'user_id' => $viewer->id,
            'date' => $from,
            'check_in_at' => '2026-03-20 08:00:00',
            'check_out_at' => null,
            'is_late' => false,
            'status' => AttendanceRecord::STATUS_ON_TIME,
        ]);

        $token = $viewer->createToken('test')->plainTextToken;

        $response = $this->getJson('/api/v1/attendance?from='.$from.'&to='.$to, [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_admin_single_day_report_includes_employees_without_record(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->givePermissionTo('attendance.admin');

        /** @var User $noRecord */
        $noRecord = User::factory()->create(['name' => 'Missing']);

        $date = '2026-03-22';

        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->getJson(
            '/api/v1/admin/attendance?date_from='.$date.'&date_to='.$date.'&per_page=50',
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertOk();
        $ids = collect($response->json('data.items'))->pluck('employee_id')->all();
        $this->assertContains($noRecord->id, $ids);

        $row = collect($response->json('data.items'))->firstWhere('employee_id', $noRecord->id);
        $this->assertNotNull($row);
        $this->assertNull($row['clock_in_at']);
        $this->assertNull($row['clock_out_at']);
    }
}
