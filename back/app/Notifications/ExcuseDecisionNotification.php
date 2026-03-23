<?php

namespace App\Notifications;

use App\Models\Excuse;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ExcuseDecisionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Excuse $excuse,
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
        $this->excuse->loadMissing('user');

        $status = $this->excuse->status;
        $verb = $status === Excuse::STATUS_APPROVED ? 'approved' : 'rejected';

        return [
            'type' => 'excuse.decision',
            'excuse_id' => $this->excuse->id,
            'status' => $status,
            'date' => $this->excuse->date?->toDateString(),
            'admin_note' => $this->excuse->admin_note,
            'message' => sprintf(
                'Your attendance excuse for %s was %s.',
                $this->excuse->date?->toDateString() ?? 'the selected date',
                $verb
            ),
            'url' => null,
        ];
    }
}
