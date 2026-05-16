<?php

namespace App\Notifications;

use App\Models\SDForm;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SdFormInformationCompletedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected SDForm $form,
        protected User $completedBy,
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
        $completedByName = $this->completedBy->name ?? __('User');

        $message = sprintf(
            'SD %s for %s: missing data has been completed by %s. Booking can continue.',
            $sdRef,
            $clientName,
            $completedByName
        );

        return [
            'type' => 'sd_form.information_completed',
            'sd_form_id' => $form->id,
            'sd_number' => $form->sd_number,
            'client_name' => $form->client?->name ?? null,
            'pol' => $form->pol?->name ?? $form->pol_text,
            'pod' => $form->pod?->name ?? $form->pod_text,
            'shipment_direction' => $form->shipment_direction,
            'status' => $form->status,
            'completed_by_name' => $completedByName,
            'message' => $message,
            'url' => null,
        ];
    }
}
