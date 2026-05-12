<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendShipmentOperationTaskReminder;
use App\Models\Shipment;
use App\Models\ShipmentOperationTask;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\ExecutionReminderResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShipmentTaskController extends Controller
{
    public function assignees(Shipment $shipment): JsonResponse
    {
        $this->authorize('update', $shipment);

        $users = User::query()
            ->role('operations')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json([
            'data' => $users,
        ]);
    }

    public function index(Shipment $shipment)
    {
        $this->authorize('view', $shipment);

        return response()->json([
            'data' => $shipment->tasks()->with(['assignedTo:id,name,email'])->get(),
        ]);
    }

    public function destroy(Shipment $shipment, ShipmentOperationTask $task): JsonResponse
    {
        $this->authorize('update', $shipment);

        if ((int) $task->shipment_id !== (int) $shipment->id) {
            abort(404, __('Task not found for this shipment.'));
        }

        $taskId = $task->id;
        $task->delete();

        ActivityLogger::log('shipment.operation_task_deleted', $shipment, [
            'task_id' => $taskId,
        ]);

        return response()->json([
            'message' => __('Task deleted.'),
        ]);
    }

    public function bulkUpdate(Request $request, Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        $validated = $request->validate([
            'tasks' => ['required', 'array'],
            'tasks.*.id' => ['nullable', 'integer', 'exists:shipment_operation_tasks,id'],
            'tasks.*.name' => ['required', 'string', 'max:255'],
            'tasks.*.sort_order' => ['required', 'integer', 'min:1', 'max:500'],
            'tasks.*.assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
            'tasks.*.due_date' => ['nullable', 'date'],
            'tasks.*.execution_at' => ['nullable', 'date'],
            'tasks.*.priority' => ['nullable', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'tasks.*.reminder_at' => ['nullable', 'date'],
            'tasks.*.reminder_before_value' => ['nullable', 'integer', 'min:1'],
            'tasks.*.reminder_before_unit' => ['nullable', 'string', Rule::in(['minute', 'minutes', 'hour', 'hours', 'day', 'days'])],
            'tasks.*.status' => ['required', 'string', 'in:pending,in_progress,done'],
            'tasks.*.completed_at' => ['nullable', 'date'],
        ]);

        $existing = $shipment->tasks()->get()->keyBy('id');

        $result = [];

        foreach ($validated['tasks'] as $taskData) {
            if (! empty($taskData['assigned_to_id'])) {
                $this->assertOperationsAssignee((int) $taskData['assigned_to_id']);
            }

            $executionAt = ! empty($taskData['execution_at'])
                ? Carbon::parse($taskData['execution_at'])
                : null;

            $reminderInput = [
                'execution_at' => $taskData['execution_at'] ?? null,
                'reminder_at' => $taskData['reminder_at'] ?? null,
                'reminder_before_value' => $taskData['reminder_before_value'] ?? null,
                'reminder_before_unit' => ExecutionReminderResolver::normalizeUnit($taskData['reminder_before_unit'] ?? null)
                    ?? ($taskData['reminder_before_unit'] ?? null),
            ];

            [$reminderAt, $reminderBeforeValue, $reminderBeforeUnit] = ExecutionReminderResolver::resolve($reminderInput);

            if ($executionAt) {
                ExecutionReminderResolver::validateReminderBeforeExecution($reminderAt, $executionAt);
            } elseif ($reminderAt) {
                // Absolute reminder without execution is allowed
            }

            if (! empty($taskData['id']) && $existing->has($taskData['id'])) {
                /** @var ShipmentOperationTask $task */
                $task = $existing->get($taskData['id']);
            } else {
                $task = new ShipmentOperationTask;
                $task->shipment_id = $shipment->id;
            }

            $task->name = $taskData['name'];
            $task->sort_order = (int) $taskData['sort_order'];
            $task->assigned_to_id = $taskData['assigned_to_id'] ?? null;
            $task->due_date = $taskData['due_date'] ?? ($executionAt?->toDateString());
            $task->execution_at = $executionAt;
            $task->priority = $taskData['priority'] ?? 'medium';
            $task->reminder_at = $reminderAt;
            $task->reminder_before_value = $reminderBeforeValue;
            $task->reminder_before_unit = $reminderBeforeUnit;
            $task->status = $taskData['status'];

            if ($task->status === 'done') {
                $task->completed_at = ! empty($taskData['completed_at'])
                    ? Carbon::parse($taskData['completed_at'])
                    : ($task->completed_at ?? now());
            } else {
                $task->completed_at = null;
            }

            $task->save();
            $result[] = $task;

            $this->dispatchTaskReminderIfNeeded($task->fresh());
        }

        ActivityLogger::log('shipment.tasks_updated', $shipment, [
            'task_count' => count($result),
        ]);

        return response()->json([
            'data' => $shipment->tasks()->with(['assignedTo:id,name,email'])->get(),
        ]);
    }

    private function assertOperationsAssignee(int $userId): void
    {
        $user = User::query()->find($userId);
        if ($user === null || ! $user->hasRole('operations')) {
            abort(422, __('Tasks can only be assigned to operations staff.'));
        }
    }

    private function dispatchTaskReminderIfNeeded(ShipmentOperationTask $task): void
    {
        if ($task->reminder_at === null || ! $task->reminder_at->isFuture() || $task->status === 'done') {
            return;
        }

        $expectedIso = $task->reminder_at->copy()->utc()->toIso8601String();

        SendShipmentOperationTaskReminder::dispatch($task->id, $expectedIso)
            ->delay($task->reminder_at);
    }
}
