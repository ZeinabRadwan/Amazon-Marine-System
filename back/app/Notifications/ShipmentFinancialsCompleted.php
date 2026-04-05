<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ShipmentFinancialsCompleted extends Notification
{
    use Queueable;

    public function __construct(
        public Invoice $invoice
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Shipment Financials Completed: :number', ['number' => $this->invoice->invoice_number]))
            ->line(__('The accountant has finalized the financials for shipment :bl.', ['bl' => $this->invoice->shipment?->bl_number ?? '#'.$this->invoice->shipment_id]))
            ->line(__('Invoice Number: :number', ['number' => $this->invoice->invoice_number]))
            ->line(__('Total Amount: :amount :currency', [
                'amount' => $this->invoice->net_amount,
                'currency' => $this->invoice->currency_code
            ]))
            ->action(__('View Shipment'), url('/shipments/' . $this->invoice->shipment_id))
            ->line(__('Thank you for using our application!'));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'invoice_id' => $this->invoice->id,
            'invoice_number' => $this->invoice->invoice_number,
            'shipment_id' => $this->invoice->shipment_id,
            'shipment_bl' => $this->invoice->shipment?->bl_number,
            'message' => __('Accountant completed financials for invoice :number', ['number' => $this->invoice->invoice_number]),
            'type' => 'shipment_financials_completed'
        ];
    }
}
