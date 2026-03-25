<?php

namespace Database\Seeders;

use App\Models\ContainerSize;
use App\Models\ContainerType;
use App\Models\FreightTerm;
use App\Models\NotifyPartyMode;
use App\Models\ShipmentDirection;
use Illuminate\Database\Seeder;

/**
 * Reference data for SD forms — aligned with UI/sd-forms.html (create/edit modal).
 * Values match StoreSDFormRequest / UpdateSDFormRequest (e.g. notify_party_mode: same|different).
 */
class SDFormLookupsSeeder extends Seeder
{
    public function run(): void
    {
        $directions = [
            ['name' => 'Export', 'sort_order' => 1],
            ['name' => 'Import', 'sort_order' => 2],
        ];
        foreach ($directions as $row) {
            ShipmentDirection::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order']]
            );
        }

        $notifyModes = [
            ['name' => 'same', 'sort_order' => 1],
            ['name' => 'different', 'sort_order' => 2],
        ];
        foreach ($notifyModes as $row) {
            NotifyPartyMode::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order']]
            );
        }

        $freight = [
            ['name' => 'Prepaid', 'sort_order' => 1],
            ['name' => 'Collect', 'sort_order' => 2],
        ];
        foreach ($freight as $row) {
            FreightTerm::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order']]
            );
        }

        $containerTypes = [
            ['name' => 'Dry', 'sort_order' => 1],
            ['name' => 'Reefer', 'sort_order' => 2],
            ['name' => 'Open Top', 'sort_order' => 3],
            ['name' => 'Flat Rack', 'sort_order' => 4],
            ['name' => 'High Cube (HQ)', 'sort_order' => 5],
        ];
        foreach ($containerTypes as $row) {
            ContainerType::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order']]
            );
        }

        $containerSizes = [
            ['name' => '20', 'sort_order' => 1],
            ['name' => '40', 'sort_order' => 2],
        ];
        foreach ($containerSizes as $row) {
            ContainerSize::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order']]
            );
        }
    }
}
