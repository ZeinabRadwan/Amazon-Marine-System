<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Shipment;
use App\Models\VendorBill;

class ShipmentService
{
    /**
     * Recalculate denormalized financial totals on a shipment.
     */
    public static function recalculateTotals(Shipment $shipment): void
    {
        $sellingTotal = Invoice::where('shipment_id', $shipment->id)->sum('net_amount');
        $costTotal = VendorBill::where('shipment_id', $shipment->id)->sum('net_amount');

        $shipment->selling_price_total = $sellingTotal;
        $shipment->cost_total = $costTotal;
        $shipment->profit_total = $sellingTotal - $costTotal;
        $shipment->save();
    }
}

