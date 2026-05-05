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
        protected string $invoiceAction = 'updated',
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
        $shipmentRef = $this->shipment->bl_number ?? ('#'.$this->shipment->id);
        $isArabic = app()->getLocale() === 'ar';
        $isCreate = strtolower($this->invoiceAction) === 'created';
        $message = $isArabic
            ? ($isCreate
                ? "تم إضافة إدراج فاتورة تكلفة للشحنة رقم {$shipmentRef}"
                : "تم تحديث إدراج فاتورة تكلفة للشحنة رقم {$shipmentRef}")
            : ($isCreate
                ? "Cost invoice has been added for shipment #{$shipmentRef}"
                : "Cost invoice has been updated for shipment #{$shipmentRef}");

        return [
            'type' => 'shipment.notify_sales_financials',
            'shipment_id' => $this->shipment->id,
            'bl_number' => $this->shipment->bl_number,
            'client_name' => $this->shipment->client?->company_name
                ?? $this->shipment->client?->name,
            'sales_rep_id' => $this->shipment->sales_rep_id,
            'sales_rep_name' => $this->shipment->salesRep?->name,
            'title' => $isArabic ? 'إدراج فاتورة تكلفة' : 'Cost Invoice Entry',
            'message' => $message,
            'body' => $message,
            'url' => null,
        ];
    }
}

