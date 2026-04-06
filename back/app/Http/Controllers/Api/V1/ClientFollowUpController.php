<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\FollowUpChannel;
use App\Enums\FollowUpKind;
use App\Enums\FollowUpOutcome;
use App\Http\Controllers\Controller;
use App\Jobs\SendClientFollowUpReminder;
use App\Models\Client;
use App\Models\ClientFollowUp;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ClientFollowUpController extends Controller
{
    private function normalizePayload(array $payload): array
    {
        if (($payload['channel'] ?? null) === null && ($payload['type'] ?? null) !== null) {
            $payload['channel'] = $payload['type'];
        }

        if (array_key_exists('outcome', $payload) && $payload['outcome'] === '') {
            $payload['outcome'] = null;
        }

        if (array_key_exists('notes', $payload) && ! array_key_exists('summary', $payload)) {
            $payload['summary'] = $payload['notes'];
        }

        return $payload;
    }

    private function validateReminderBeforeNext(?Carbon $reminderAt, ?Carbon $nextFollowUp): void
    {
        if ($reminderAt && $nextFollowUp && $reminderAt->gte($nextFollowUp)) {
            throw ValidationException::withMessages([
                'reminder_at' => [__('Reminder time must be before the next follow-up time.')],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: ?Carbon, 1: ?int, 2: ?string}
     */
    private function resolveReminderAt(array $validated): array
    {
        $hasAbsolute = ! empty($validated['reminder_at']);
        $hasRelative = ! empty($validated['reminder_before_value']) && ! empty($validated['reminder_before_unit']);

        if ($hasAbsolute && $hasRelative) {
            throw ValidationException::withMessages([
                'reminder_at' => [__('Choose either a reminder time or a relative reminder, not both.')],
            ]);
        }

        // if (! $hasAbsolute && ! $hasRelative) {
        //     throw ValidationException::withMessages([
        //         'reminder_at' => [__('Choose how to set the reminder.')],
        //     ]);
        // }

        if ($hasAbsolute) {
            return [Carbon::parse($validated['reminder_at']), null, null];
        }

        if (empty($validated['next_follow_up_at'])) {
            throw ValidationException::withMessages([
                'next_follow_up_at' => [__('Next follow-up is required when using a reminder before that time.')],
            ]);
        }

        $next = Carbon::parse($validated['next_follow_up_at']);
        $value = (int) $validated['reminder_before_value'];
        if ($value < 1) {
            throw ValidationException::withMessages([
                'reminder_before_value' => [__('Enter a positive number.')],
            ]);
        }

        $unit = (string) $validated['reminder_before_unit'];
        $reminderAt = match ($unit) {
            'minute' => $next->copy()->subMinutes($value),
            'hour' => $next->copy()->subHours($value),
            'day' => $next->copy()->subDays($value),
            default => throw ValidationException::withMessages([
                'reminder_before_unit' => [__('Invalid reminder unit.')],
            ]),
        };

        return [$reminderAt, $value, $unit];
    }

    private function ensureClientFollowUp(Client $client, ClientFollowUp $followUp): void
    {
        if ((int) $followUp->client_id !== (int) $client->id) {
            abort(404, __('Follow-up not found for this client.'));
        }
    }

    /**
     * List follow-ups (متابعات) for a client.
     */
    public function index(Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        $followUps = $client->followUps()
            ->with('createdBy:id,name')
            ->orderByDesc('occurred_at')
            ->get();

        return response()->json([
            'data' => $followUps->map(fn (ClientFollowUp $f) => $this->serializeFollowUp($f)),
        ]);
    }

    /**
     * Add a follow-up (إضافة متابعة) for a client.
     */
    public function store(Request $request, Client $client): JsonResponse
    {
        $this->authorize('manageClientContent', $client);

        $payload = $this->normalizePayload($request->all());

        $validated = Validator::make($payload, [
            'channel' => ['required', Rule::enum(FollowUpChannel::class)],
            'followup_type' => ['required', Rule::enum(FollowUpKind::class)],
            'occurred_at' => ['required', 'date'],
            'summary' => ['required', 'string', 'max:65535'],
            'next_follow_up_at' => ['nullable', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'reminder_before_value' => ['nullable', 'integer', 'min:1'],
            'reminder_before_unit' => ['nullable', Rule::in(['minute', 'hour', 'day'])],
            'outcome' => ['nullable', Rule::enum(FollowUpOutcome::class)],
        ])->validate();

        $nextFollowUp = ! empty($validated['next_follow_up_at'])
            ? Carbon::parse($validated['next_follow_up_at'])
            : null;

        [$reminderAt, $reminderBeforeValue, $reminderBeforeUnit] = $this->resolveReminderAt($validated);

        $this->validateReminderBeforeNext($reminderAt, $nextFollowUp);

        $followUp = new ClientFollowUp;
        $followUp->client_id = $client->id;
        $followUp->channel = $this->enumOrString($validated['channel']);
        $followUp->followup_type = $this->enumOrString($validated['followup_type']);
        $followUp->outcome = isset($validated['outcome']) ? $this->enumOrString($validated['outcome']) : null;
        $followUp->occurred_at = Carbon::parse($validated['occurred_at']);
        $followUp->summary = $validated['summary'];
        $followUp->next_follow_up_at = $nextFollowUp;
        $followUp->reminder_at = $reminderAt;
        $followUp->reminder_before_value = $reminderBeforeValue;
        $followUp->reminder_before_unit = $reminderBeforeUnit;
        $followUp->created_by_id = $request->user()->id;
        $followUp->save();

        if ($reminderAt && $reminderAt->isFuture()) {
            SendClientFollowUpReminder::dispatch($followUp->id)->delay($reminderAt);
        }

        return response()->json([
            'data' => $this->serializeFollowUp($followUp->fresh(['createdBy:id,name'])),
        ], 201);
    }

    /**
     * Update a follow-up for a client.
     */
    public function update(Request $request, Client $client, ClientFollowUp $followUp): JsonResponse
    {
        $this->authorize('manageClientContent', $client);
        $this->ensureClientFollowUp($client, $followUp);

        $payload = $this->normalizePayload($request->all());
        $validated = Validator::make($payload, [
            'channel' => ['sometimes', Rule::enum(FollowUpChannel::class)],
            'followup_type' => ['sometimes', Rule::enum(FollowUpKind::class)],
            'occurred_at' => ['sometimes', 'date'],
            'summary' => ['required', 'string', 'max:65535'],
            'next_follow_up_at' => ['sometimes', 'nullable', 'date'],
            'reminder_at' => ['sometimes', 'nullable', 'date'],
            'reminder_before_value' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'reminder_before_unit' => ['sometimes', 'nullable', Rule::in(['minute', 'hour', 'day'])],
            'outcome' => ['sometimes', 'nullable', Rule::enum(FollowUpOutcome::class)],
        ])->validate();

        $reminderTouched = array_key_exists('reminder_at', $payload)
            || array_key_exists('reminder_before_value', $payload)
            || array_key_exists('reminder_before_unit', $payload);

        if (array_key_exists('channel', $validated)) {
            $followUp->channel = $this->enumOrString($validated['channel']);
        }
        if (array_key_exists('followup_type', $validated)) {
            $followUp->followup_type = $this->enumOrString($validated['followup_type']);
        }
        if (array_key_exists('outcome', $validated)) {
            $followUp->outcome = $validated['outcome'] !== null ? $this->enumOrString($validated['outcome']) : null;
        }
        if (array_key_exists('occurred_at', $validated)) {
            $followUp->occurred_at = Carbon::parse($validated['occurred_at']);
        }
        if (array_key_exists('summary', $validated)) {
            $followUp->summary = $validated['summary'];
        }
        if (array_key_exists('next_follow_up_at', $validated)) {
            $followUp->next_follow_up_at = ! empty($validated['next_follow_up_at'])
                ? Carbon::parse($validated['next_follow_up_at'])
                : null;
        }

        if ($reminderTouched) {
            $mergedForReminder = [
                'next_follow_up_at' => array_key_exists('next_follow_up_at', $validated)
                    ? $validated['next_follow_up_at']
                    : $followUp->next_follow_up_at?->format('Y-m-d H:i:s'),
                'reminder_at' => array_key_exists('reminder_at', $payload) ? $payload['reminder_at'] : null,
                'reminder_before_value' => array_key_exists('reminder_before_value', $payload) ? $payload['reminder_before_value'] : null,
                'reminder_before_unit' => array_key_exists('reminder_before_unit', $payload) ? $payload['reminder_before_unit'] : null,
            ];
            [$reminderAt, $reminderBeforeValue, $reminderBeforeUnit] = $this->resolveReminderAt($mergedForReminder);
            $nextForCheck = $followUp->next_follow_up_at;
            $this->validateReminderBeforeNext($reminderAt, $nextForCheck);

            $followUp->reminder_at = $reminderAt;
            $followUp->reminder_before_value = $reminderBeforeValue;
            $followUp->reminder_before_unit = $reminderBeforeUnit;
        }

        $followUp->save();

        if ($reminderTouched && $followUp->reminder_at && $followUp->reminder_at->isFuture()) {
            SendClientFollowUpReminder::dispatch($followUp->id)->delay($followUp->reminder_at);
        }

        return response()->json([
            'data' => $this->serializeFollowUp($followUp->fresh(['createdBy:id,name'])),
        ]);
    }

    /**
     * Delete a follow-up for a client.
     */
    public function destroy(Request $request, Client $client, ClientFollowUp $followUp): JsonResponse
    {
        $this->authorize('manageClientContent', $client);
        $this->ensureClientFollowUp($client, $followUp);

        $followUp->delete();

        return response()->json([
            'message' => __('Follow-up deleted.'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializeFollowUp(ClientFollowUp $f): array
    {
        return [
            'id' => $f->id,
            'channel' => $f->channel,
            'type' => $f->channel,
            'followup_type' => $f->followup_type,
            'outcome' => $f->outcome,
            'occurred_at' => $f->occurred_at,
            'summary' => $f->summary,
            'next_follow_up_at' => $f->next_follow_up_at,
            'reminder_at' => $f->reminder_at,
            'reminder_before_value' => $f->reminder_before_value,
            'reminder_before_unit' => $f->reminder_before_unit,
            'created_by_id' => $f->created_by_id,
            'created_by' => $f->createdBy ? ['id' => $f->createdBy->id, 'name' => $f->createdBy->name] : null,
            'created_at' => $f->created_at,
        ];
    }

    protected function enumOrString(mixed $value): string
    {
        if ($value instanceof \BackedEnum) {
            return $value->value;
        }

        return (string) $value;
    }
}
