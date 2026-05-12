<?php

namespace App\Notifications;

use App\Models\SDForm;
use App\Models\SDFormBookingConfirmation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SdFormBookingConfirmationUploadedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected SDForm $sdForm,
        protected SDFormBookingConfirmation $confirmation,
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
        $this->sdForm->loadMissing(['client']);
        $sdRef = $this->sdForm->sd_number ?? ('#'.$this->sdForm->id);
        $message = __('messages.new_booking_confirmation_uploaded');

        return [
            'type' => 'sd_form.booking_confirmation_uploaded',
            'sd_form_id' => $this->sdForm->id,
            'sd_form_booking_confirmation_id' => $this->confirmation->id,
            'file_name' => $this->confirmation->name,
            'title' => __('messages.booking_confirmation_title'),
            'message' => $message,
            'body' => $message,
            'sd_number' => $this->sdForm->sd_number,
            'client_name' => $this->sdForm->client?->company_name ?? $this->sdForm->client?->name,
            'url' => null,
            'meta' => [
                'sd_ref' => $sdRef,
            ],
        ];
    }
}
