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
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ShipmentTaskController extends Controller
{
    public function assignees(Shipment $shipment): JsonResponse
    {
        $this->authorize('update', $shipment);

        $users = User::query()
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['operations', 'admin']))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return response()->json([
            'data' => $users,
        ]);
    }

    public function index(Shipment $shipment)
    {
        $this->authorize('update', $shipment);

        return response()->json([
            'data' => $shipment->tasks()->with(['assignedTo:id,name,email'])->get()->map(fn (ShipmentOperationTask $t) => $this->serializeTaskResponse($t)),
        ]);
    }

    public function destroy(Shipment $shipment, ShipmentOperationTask $task): JsonResponse
    {
        $this->authorize('update', $shipment);

        if ((int) $task->shipment_id !== (int) $shipment->id) {
            abort(404, __('Task not found for this shipment.'));
        }

        $taskId = $task->id;
        $taskName = $task->name;
        $performer = Auth::user();
        $performedBy = $performer instanceof User
            ? ['id' => $performer->id, 'name' => $performer->name]
            : ['id' => null, 'name' => '—'];
        $task->delete();

        ActivityLogger::log('shipment.operation_task_deleted', $shipment, [
            'action' => 'TASK_DELETED',
            'shipment_id' => $shipment->id,
            'task_id' => $taskId,
            'task_name' => $taskName,
            'performed_by' => $performedBy,
            'timestamp' => now()->toIso8601String(),
            'old_value' => $taskName,
            'new_value' => '',
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
            'tasks.*.status' => ['required', 'string', 'in:pending,completed,delegated'],
            'tasks.*.completed_at' => ['nullable', 'date'],
        ]);

        $existing = $shipment->tasks()->get()->keyBy('id');

        foreach ($validated['tasks'] as $taskData) {
            if (array_key_exists('assigned_to_id', $taskData) && ! empty($taskData['assigned_to_id'])) {
                $this->assertOperationsAssignee((int) $taskData['assigned_to_id']);
            }

            $executionAt = ! empty($taskData['execution_at'])
                ? Carbon::parse($taskData['execution_at'])
                : null;

            $rbUnit = ExecutionReminderResolver::normalizeUnit($taskData['reminder_before_unit'] ?? null);
            $reminderInput = [
                'execution_at' => $taskData['execution_at'] ?? null,
                'reminder_at' => $taskData['reminder_at'] ?? null,
                'reminder_before_value' => $taskData['reminder_before_value'] ?? null,
                'reminder_before_unit' => $rbUnit,
            ];

            [$reminderAt, $reminderBeforeValue, $reminderBeforeUnit] = ExecutionReminderResolver::resolve($reminderInput);

            if ($reminderAt && $executionAt) {
                ExecutionReminderResolver::validateReminderBeforeExecution($reminderAt, $executionAt);
            }

            if (! empty($taskData['id']) && $existing->has($taskData['id'])) {
                /** @var ShipmentOperationTask $task */
                $task = $existing->get($taskData['id']);
            } else {
                $task = new ShipmentOperationTask;
                $task->shipment_id = $shipment->id;
            }

            $isNew = ! $task->exists;
            $beforeSnapshot = $task->exists ? $this->taskAuditSnapshot($task) : [];

            $task->name = $taskData['name'];
            $task->sort_order = (int) $taskData['sort_order'];
            if (! $task->exists) {
                $task->assigned_to_id = array_key_exists('assigned_to_id', $taskData)
                    ? $taskData['assigned_to_id']
                    : null;
            } elseif (array_key_exists('assigned_to_id', $taskData)) {
                $task->assigned_to_id = $taskData['assigned_to_id'];
            }
            $task->due_date = $taskData['due_date'] ?? ($executionAt?->toDateString());
            $task->execution_at = $executionAt;
            $task->priority = $taskData['priority'] ?? 'medium';
            $task->reminder_at = $reminderAt;
            $task->reminder_before_value = $reminderBeforeValue;
            $task->reminder_before_unit = $reminderBeforeUnit;
            $task->status = $taskData['status'];

            if ($task->status === 'completed') {
                $task->completed_at = ! empty($taskData['completed_at'])
                    ? Carbon::parse($taskData['completed_at'])
                    : ($task->completed_at ?? now());
            } else {
                $task->completed_at = null;
            }

            $task->save();

            if (array_key_exists('assigned_to_id', $taskData)) {
                Log::debug('shipment_operation_task.assignee_persisted', [
                    'task_id' => $task->id,
                    'shipment_id' => $shipment->id,
                    'assigned_to_id' => $task->assigned_to_id,
                ]);
            }

            $this->logShipmentOperationTaskLifecycle($shipment, $task, $isNew, $beforeSnapshot);
            $this->dispatchTaskReminderIfNeeded($task->fresh());
        }

        return response()->json([
            'data' => $shipment->tasks()->with(['assignedTo:id,name,email'])->get()->map(fn (ShipmentOperationTask $t) => $this->serializeTaskResponse($t)),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeTaskResponse(ShipmentOperationTask $task): array
    {
        $task->loadMissing('assignedTo:id,name,email');

        return [
            'id' => $task->id,
            'shipment_id' => $task->shipment_id,
            'name' => $task->name,
            'sort_order' => $task->sort_order,
            'assigned_to_id' => $task->assigned_to_id,
            'assigned_user' => $task->assignedTo ? [
                'id' => $task->assignedTo->id,
                'name' => $task->assignedTo->name,
            ] : null,
            'due_date' => $task->due_date?->toDateString(),
            'execution_at' => $task->execution_at?->toIso8601String(),
            'priority' => $task->priority ?? 'medium',
            'reminder_at' => $task->reminder_at?->toIso8601String(),
            'reminder_before_value' => $task->reminder_before_value,
            'reminder_before_unit' => $task->reminder_before_unit,
            'status' => $task->status,
            'completed_at' => $task->completed_at?->toIso8601String(),
            'created_at' => $task->created_at?->toIso8601String(),
            'updated_at' => $task->updated_at?->toIso8601String(),
            'assigned_to' => $task->assignedTo ? [
                'id' => $task->assignedTo->id,
                'name' => $task->assignedTo->name,
                'email' => $task->assignedTo->email,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function taskAuditSnapshot(ShipmentOperationTask $task): array
    {
        return $task->only([
            'name',
            'assigned_to_id',
            'status',
            'priority',
            'due_date',
            'execution_at',
            'reminder_at',
            'reminder_before_value',
            'reminder_before_unit',
            'sort_order',
        ]);
    }

    /**
     * @param  array<string, mixed>  $before
     */
    private function logShipmentOperationTaskLifecycle(Shipment $shipment, ShipmentOperationTask $task, bool $isNew, array $before): void
    {
        $after = $this->taskAuditSnapshot($task);

        if ($isNew) {
            ActivityLogger::log('shipment.operation_task_created', $shipment, [
                'action' => 'TASK_CREATED',
                'shipment_id' => $shipment->id,
                'task_id' => $task->id,
                'task_name' => $task->name,
                'timestamp' => now()->toIso8601String(),
                'old_value' => '',
                'new_value' => $task->name,
            ]);

            return;
        }

        $oldAssignee = $before['assigned_to_id'] ?? null;
        $newAssignee = $after['assigned_to_id'] ?? null;
        if ((int) ($oldAssignee ?? 0) !== (int) ($newAssignee ?? 0)) {
            $performer = Auth::user();
            $performedBy = $performer instanceof User
                ? ['id' => $performer->id, 'name' => $performer->name]
                : ['id' => null, 'name' => '—'];

            $prevUser = $oldAssignee ? User::query()->find((int) $oldAssignee) : null;
            $newUser = $newAssignee ? User::query()->find((int) $newAssignee) : null;

            $previousAssignee = $oldAssignee
                ? ($prevUser
                    ? ['id' => $prevUser->id, 'name' => $prevUser->name]
                    : ['id' => (int) $oldAssignee, 'name' => $this->assigneeDisplayName((int) $oldAssignee)])
                : null;
            $newAssigneePayload = $newAssignee
                ? ($newUser
                    ? ['id' => $newUser->id, 'name' => $newUser->name]
                    : ['id' => (int) $newAssignee, 'name' => $this->assigneeDisplayName((int) $newAssignee)])
                : null;

            ActivityLogger::log('shipment.operation_task_delegated', $shipment, [
                'action' => 'TASK_DELEGATED',
                'shipment_id' => $shipment->id,
                'task_id' => $task->id,
                'task_name' => $task->name,
                'performed_by' => $performedBy,
                'previous_assignee' => $previousAssignee,
                'new_assignee' => $newAssigneePayload,
                'timestamp' => now()->toIso8601String(),
                'old_value' => $this->assigneeDisplayName($oldAssignee !== null ? (int) $oldAssignee : null),
                'new_value' => $this->assigneeDisplayName($newAssignee !== null ? (int) $newAssignee : null),
                'assigned_from_id' => $oldAssignee,
                'assigned_to_id' => $newAssignee,
            ]);
        }

        $oldStatus = $before['status'] ?? null;
        $newStatus = $after['status'] ?? null;
        if ($oldStatus !== 'completed' && $newStatus === 'completed') {
            $performer = Auth::user();
            $performedBy = $performer instanceof User
                ? ['id' => $performer->id, 'name' => $performer->name]
                : ['id' => null, 'name' => '—'];
            ActivityLogger::log('shipment.operation_task_completed', $shipment, [
                'action' => 'TASK_COMPLETED',
                'shipment_id' => $shipment->id,
                'task_id' => $task->id,
                'task_name' => $task->name,
                'performed_by' => $performedBy,
                'timestamp' => now()->toIso8601String(),
                'old_value' => (string) ($oldStatus ?? ''),
                'new_value' => 'completed',
            ]);
        } elseif ($oldStatus === 'completed' && $newStatus !== 'completed') {
            ActivityLogger::log('shipment.operation_task_reopened', $shipment, [
                'task_id' => $task->id,
                'task_name' => $task->name,
                'old_value' => 'completed',
                'new_value' => (string) ($newStatus ?? ''),
            ]);
        }

        $otherKeys = ['name', 'status', 'priority', 'due_date', 'execution_at', 'reminder_at', 'reminder_before_value', 'reminder_before_unit', 'sort_order'];
        $excludeStatusFromUpdated = ($oldStatus !== 'completed' && $newStatus === 'completed')
            || ($oldStatus === 'completed' && $newStatus !== 'completed');

        $changes = [];
        foreach ($otherKeys as $key) {
            if ($key === 'status' && $excludeStatusFromUpdated) {
                continue;
            }
            $v0 = $before[$key] ?? null;
            $v1 = $after[$key] ?? null;
            if ($this->scalarForTaskDiff($v0) !== $this->scalarForTaskDiff($v1)) {
                $changes[$key] = ['from' => $v0, 'to' => $v1];
            }
        }

        if ($changes !== []) {
            ActivityLogger::log('shipment.operation_task_updated', $shipment, [
                'task_id' => $task->id,
                'task_name' => $task->name,
                'changes' => $changes,
                'old_value' => $this->summarizeTaskChanges($changes, 'from'),
                'new_value' => $this->summarizeTaskChanges($changes, 'to'),
            ]);
        }
    }

    private function assigneeDisplayName(?int $userId): string
    {
        if ($userId === null || $userId === 0) {
            return '—';
        }

        $name = User::query()->whereKey($userId)->value('name');

        return $name ?: '#'.$userId;
    }

    private function scalarForTaskDiff(mixed $v): string
    {
        if ($v === null) {
            return '';
        }
        if ($v instanceof CarbonInterface) {
            return $v->toIso8601String();
        }
        if (is_array($v)) {
            return json_encode($v);
        }

        return (string) $v;
    }

    /**
     * @param  array<string, array{from: mixed, to: mixed}>  $changes
     */
    private function summarizeTaskChanges(array $changes, string $side): string
    {
        $parts = [];
        foreach ($changes as $key => $pair) {
            $val = $pair[$side] ?? null;
            $parts[] = $key.': '.$this->scalarForTaskDiff($val);
        }

        return implode('; ', $parts);
    }

    private function assertOperationsAssignee(int $userId): void
    {
        $user = User::query()->find($userId);
        if ($user === null || ! ($user->hasRole('operations') || $user->hasRole('admin'))) {
            abort(422, __('Tasks can only be assigned to operations or admin users.'));
        }
    }

    private function dispatchTaskReminderIfNeeded(ShipmentOperationTask $task): void
    {
        if ($task->reminder_at === null || ! $task->reminder_at->isFuture() || $task->status === 'completed') {
            return;
        }

        $expectedIso = $task->reminder_at->copy()->utc()->toIso8601String();

        SendShipmentOperationTaskReminder::dispatch($task->id, $expectedIso)
            ->delay($task->reminder_at);
    }
}
