<?php

namespace App\Notifications;

use App\Models\SDForm;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SdFormInformationRequestedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected SDForm $form,
        protected string $note,
    ) {}

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
        $form = $this->form->loadMissing(['client', 'pol', 'pod']);
        $sdRef = $form->sd_number ?? ('#'.$form->id);
        $clientName = $form->client?->name ?? 'client';

        $message = sprintf(
            'SD %s for %s requires data completion. Please review the operations note and update the form.',
            $sdRef,
            $clientName
        );

        return [
            'type' => 'sd_form.information_requested',
            'sd_form_id' => $form->id,
            'sd_number' => $form->sd_number,
            'client_name' => $form->client?->name ?? null,
            'pol' => $form->pol?->name ?? $form->pol_text,
            'pod' => $form->pod?->name ?? $form->pod_text,
            'shipment_direction' => $form->shipment_direction,
            'status' => $form->status,
            'information_request_note' => $this->note,
            'message' => $message,
            'url' => null,
        ];
    }
}
