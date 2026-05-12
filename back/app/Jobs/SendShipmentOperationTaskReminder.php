<?php

namespace App\Jobs;

use App\Models\ShipmentOperationTask;
use App\Models\User;
use App\Notifications\ShipmentOperationTaskReminderNotification;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendShipmentOperationTaskReminder implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $shipmentOperationTaskId,
        public string $expectedReminderAtIso,
    ) {}

    public function handle(NotificationService $notificationService): void
    {
        $task = ShipmentOperationTask::query()->find($this->shipmentOperationTaskId);

        if ($task === null || $task->reminder_at === null || $task->status === 'done') {
            return;
        }

        $expected = Carbon::parse($this->expectedReminderAtIso);
        if (! $task->reminder_at->equalTo($expected)) {
            return;
        }

        $task->loadMissing(['shipment', 'assignedTo']);

        $assigneeId = $task->assigned_to_id;
        $user = $assigneeId ? User::query()->find($assigneeId) : null;

        if ($user === null) {
            return;
        }

        $notificationService->sendDatabaseNotification(
            'shipment.operation_task_reminder',
            $task,
            [$user],
            new ShipmentOperationTaskReminderNotification($task)
        );
    }
}
