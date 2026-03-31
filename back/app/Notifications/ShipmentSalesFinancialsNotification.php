<?php

namespace App\Notifications;

use App\Models\Shipment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ShipmentSalesFinancialsNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Shipment $shipment,
    ) {
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $this->shipment->loadMissing(['client', 'salesRep']);

        return [
            'type' => 'shipment.notify_sales_financials',
            'shipment_id' => $this->shipment->id,
            'bl_number' => $this->shipment->bl_number,
            'client_name' => $this->shipment->client?->company_name
                ?? $this->shipment->client?->name,
            'sales_rep_id' => $this->shipment->sales_rep_id,
            'sales_rep_name' => $this->shipment->salesRep?->name,
            'message' => __('Financials for shipment :bl are ready for your review.', [
                'bl' => $this->shipment->bl_number ?? ('#'.$this->shipment->id),
            ]),
            'url' => null,
        ];
    }
}

