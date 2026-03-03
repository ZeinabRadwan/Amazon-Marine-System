<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentOperationTask;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class ShipmentTaskController extends Controller
{
    public function index(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        return response()->json([
            'data' => $shipment->tasks()->get(),
        ]);
    }

    public function bulkUpdate(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'tasks' => ['required', 'array'],
            'tasks.*.id' => ['nullable', 'integer', 'exists:shipment_operation_tasks,id'],
            'tasks.*.name' => ['required', 'string', 'max:255'],
            'tasks.*.sort_order' => ['required', 'integer', 'min:1', 'max:50'],
            'tasks.*.assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
            'tasks.*.due_date' => ['nullable', 'date'],
            'tasks.*.status' => ['required', 'string', 'in:pending,in_progress,done'],
            'tasks.*.completed_at' => ['nullable', 'date'],
        ]);

        $existing = $shipment->tasks()->get()->keyBy('id');

        $result = [];

        foreach ($validated['tasks'] as $taskData) {
            if (! empty($taskData['id']) && $existing->has($taskData['id'])) {
                /** @var ShipmentOperationTask $task */
                $task = $existing->get($taskData['id']);
                $task->fill($taskData);
                $task->save();
            } else {
                $task = new ShipmentOperationTask($taskData);
                $task->shipment_id = $shipment->id;
                $task->save();
            }

            $result[] = $task;
        }

        ActivityLogger::log('shipment.tasks_updated', $shipment, [
            'task_count' => count($result),
        ]);

        return response()->json([
            'data' => $shipment->tasks()->get(),
        ]);
    }
}

