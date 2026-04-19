<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Database\Seeders\ClientStatusesSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ClientImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(ClientStatusesSeeder::class);
    }

    protected function actingAsImporter(): User
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo(['clients.view', 'clients.manage']);

        return $user;
    }

    public function test_import_rejects_file_without_required_columns(): void
    {
        $user = $this->actingAsImporter();
        $csv = "foo,bar\n1,2\n";
        $file = UploadedFile::fake()->createWithContent('bad.csv', $csv);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/clients/import', ['file' => $file]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['errors']);
    }

    public function test_import_rejects_row_with_invalid_phone(): void
    {
        $user = $this->actingAsImporter();
        $csv = "name,phone\nTest User,abc\n";
        $file = UploadedFile::fake()->createWithContent('clients.csv', $csv);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/clients/import', ['file' => $file]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertNotEmpty($response->json('errors'));
    }

    public function test_import_rejects_duplicate_phone_in_file(): void
    {
        $user = $this->actingAsImporter();
        $csv = "name,phone\nA User,55511112222\nB User,55511112222\n";
        $file = UploadedFile::fake()->createWithContent('clients.csv', $csv);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/clients/import', ['file' => $file]);

        $response->assertStatus(422)->assertJsonPath('success', false);
        $this->assertDatabaseCount('clients', 0);
    }

    public function test_import_rejects_when_phone_exists_in_database(): void
    {
        $user = $this->actingAsImporter();
        Client::factory()->create([
            'phone' => '55599998888',
            'client_type' => 'lead',
        ]);

        $csv = "name,phone\nOther Person,55599998888\n";
        $file = UploadedFile::fake()->createWithContent('clients.csv', $csv);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/clients/import', ['file' => $file]);

        $response->assertStatus(422)->assertJsonPath('success', false);
        $this->assertDatabaseCount('clients', 1);
    }

    public function test_import_inserts_valid_rows(): void
    {
        $user = $this->actingAsImporter();
        $csv = "name,phone,email,company_name,status\nJane Doe,55512345670,,Acme,New\nJohn Roe,55512345671,john@example.com,,Contacted\n";
        $file = UploadedFile::fake()->createWithContent('clients.csv', $csv);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/clients/import', ['file' => $file]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported_count', 2);

        $this->assertDatabaseCount('clients', 2);
        $this->assertDatabaseHas('clients', [
            'name' => 'Jane Doe',
            'phone' => '55512345670',
            'company_name' => 'Acme',
        ]);
        $this->assertDatabaseHas('clients', [
            'name' => 'John Roe',
            'email' => 'john@example.com',
        ]);
    }

    public function test_import_template_returns_xlsx(): void
    {
        $user = $this->actingAsImporter();

        $response = $this->actingAs($user, 'sanctum')
            ->get('/api/v1/clients/import-template');

        $response->assertOk();
        $this->assertStringContainsString(
            'spreadsheetml',
            (string) $response->headers->get('Content-Type')
        );
    }
}
