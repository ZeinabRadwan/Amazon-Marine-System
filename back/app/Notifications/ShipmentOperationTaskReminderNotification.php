<?php

namespace App\Notifications;

use App\Models\ShipmentOperationTask;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ShipmentOperationTaskReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected ShipmentOperationTask $task,
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
        $this->task->loadMissing(['shipment']);

        $shipment = $this->task->shipment;
        $ref = $shipment?->bl_number ?? $shipment?->booking_number ?? ('#'.$shipment?->id);

        return [
            'type' => 'shipment.operation_task_reminder',
            'shipment_operation_task_id' => $this->task->id,
            'shipment_id' => $this->task->shipment_id,
            'task_name' => $this->task->name,
            'message' => __('Shipment task reminder: :task — shipment :ref.', [
                'task' => $this->task->name,
                'ref' => $ref ?? '—',
            ]),
            'url' => null,
        ];
    }
}
