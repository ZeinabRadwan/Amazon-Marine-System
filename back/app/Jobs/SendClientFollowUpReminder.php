<?php

namespace App\Jobs;

use App\Models\ClientFollowUp;
use App\Models\User;
use App\Notifications\ClientFollowUpReminderNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendClientFollowUpReminder implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $clientFollowUpId,
    ) {}

    public function handle(): void
    {
        $followUp = ClientFollowUp::query()->find($this->clientFollowUpId);

        if ($followUp === null || $followUp->reminder_at === null) {
            return;
        }

        $followUp->loadMissing(['client', 'createdBy']);

        $assigneeId = $followUp->client?->assigned_sales_id;
        $user = $assigneeId
            ? User::query()->find($assigneeId)
            : $followUp->createdBy;

        if ($user === null) {
            return;
        }

        $user->notify(new ClientFollowUpReminderNotification($followUp));
    }
}
