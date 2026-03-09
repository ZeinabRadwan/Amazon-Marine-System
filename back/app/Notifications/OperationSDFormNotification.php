<?php

namespace App\Notifications;

use App\Models\SDForm;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OperationSDFormNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected SDForm $form,
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
        $form = $this->form->loadMissing(['client', 'pol', 'pod']);

        return [
            'type' => 'sd_form.sent_to_operations',
            'sd_form_id' => $form->id,
            'sd_number' => $form->sd_number,
            'client_name' => $form->client?->name ?? null,
            'pol' => $form->pol?->name ?? $form->pol_text,
            'pod' => $form->pod?->name ?? $form->pod_text,
            'shipment_direction' => $form->shipment_direction,
            'status' => $form->status,
            'message' => sprintf(
                'SD %s for %s has been sent to operations.',
                $form->sd_number ?? ('#' . $form->id),
                $form->client?->name ?? 'client'
            ),
            'url' => null,
        ];
    }
}

