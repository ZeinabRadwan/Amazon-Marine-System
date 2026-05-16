<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\SDForm;
use App\Models\User;
use App\Notifications\SdFormInformationCompletedNotification;
use App\Notifications\SdFormInformationRequestedNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SdFormInformationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['permissions.verification_enabled' => true]);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_operations_request_information_notifies_sales_rep(): void
    {
        Notification::fake();

        $salesRep = User::factory()->create(['status' => 'active']);
        $salesRep->assignRole('sales');

        $operations = User::factory()->create(['status' => 'active']);
        $operations->assignRole('operations');

        $client = Client::factory()->create();
        $form = SDForm::create([
            'sd_number' => 'SD-INFO-REQ-1',
            'client_id' => $client->id,
            'sales_rep_id' => $salesRep->id,
            'status' => 'sent_to_operations',
            'shipment_direction' => 'Export',
            'sent_to_operations_at' => now(),
        ]);

        $token = $operations->createToken('test')->plainTextToken;

        $response = $this->postJson("/api/v1/sd-forms/{$form->id}/request-information", [
            'note' => 'Please add ACID number',
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $form->refresh();
        $this->assertSame('information_requested', $form->status);
        $this->assertSame('Please add ACID number', $form->information_request_note);

        Notification::assertSentTo($salesRep, SdFormInformationRequestedNotification::class);
    }

    public function test_sales_can_complete_information_and_notify_operations(): void
    {
        Notification::fake();

        $salesRep = User::factory()->create(['status' => 'active']);
        $salesRep->assignRole('sales');
        $salesRep->givePermissionTo('sd_forms.manage');

        $operations = User::factory()->create(['status' => 'active']);
        $operations->assignRole('operations');

        $client = Client::factory()->create();
        $form = SDForm::create([
            'sd_number' => 'SD-INFO-COMP-1',
            'client_id' => $client->id,
            'sales_rep_id' => $salesRep->id,
            'status' => 'information_requested',
            'shipment_direction' => 'Export',
            'sent_to_operations_at' => now(),
            'information_request_note' => 'Missing ACID',
            'information_requested_at' => now(),
        ]);

        $token = $salesRep->createToken('test')->plainTextToken;

        $response = $this->postJson("/api/v1/sd-forms/{$form->id}/complete-information", [], [
            'Authorization' => 'Bearer '.$token,
        ]);

        $response->assertOk();
        $form->refresh();
        $this->assertSame('sent_to_operations', $form->status);

        Notification::assertSentTo($operations, SdFormInformationCompletedNotification::class);
    }

    public function test_operations_cannot_complete_information(): void
    {
        $operations = User::factory()->create(['status' => 'active']);
        $operations->assignRole('operations');

        $client = Client::factory()->create();
        $form = SDForm::create([
            'sd_number' => 'SD-INFO-OPS-1',
            'client_id' => $client->id,
            'status' => 'information_requested',
            'shipment_direction' => 'Export',
            'sent_to_operations_at' => now(),
        ]);

        $token = $operations->createToken('test')->plainTextToken;

        $this->postJson("/api/v1/sd-forms/{$form->id}/complete-information", [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }
}
