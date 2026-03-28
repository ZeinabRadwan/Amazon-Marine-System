<?php

namespace App\Notifications;

use App\Models\ClientFollowUp;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ClientFollowUpReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected ClientFollowUp $followUp,
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
        $this->followUp->loadMissing(['client']);

        $clientName = $this->followUp->client?->name
            ?? $this->followUp->client?->company_name
            ?? __('Client');

        $next = $this->followUp->next_follow_up_at;

        return [
            'type' => 'client_follow_up.reminder',
            'client_follow_up_id' => $this->followUp->id,
            'client_id' => $this->followUp->client_id,
            'client_name' => $clientName,
            'followup_type' => $this->followUp->followup_type,
            'next_follow_up_at' => $next?->toIso8601String(),
            'message' => __('Follow-up reminder: :client — next at :when (:kind).', [
                'client' => $clientName,
                'when' => $next?->timezone(config('app.timezone'))->format('Y-m-d H:i') ?? '—',
                'kind' => $this->followUp->followup_type ?? '—',
            ]),
            'url' => null,
        ];
    }
}
