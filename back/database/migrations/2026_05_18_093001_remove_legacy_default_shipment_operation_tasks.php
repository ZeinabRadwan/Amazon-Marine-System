<?php

use App\Support\LegacyDefaultShipmentOperationTaskNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $names = LegacyDefaultShipmentOperationTaskNames::all();

        if ($names === []) {
            return;
        }

        DB::table('shipment_operation_tasks')->whereIn('name', $names)->delete();
    }

    public function down(): void
    {
        // Non-reversible: default tasks are no longer part of the product workflow.
    }
};
