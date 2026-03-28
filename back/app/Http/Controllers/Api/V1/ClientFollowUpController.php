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

        $payload = $request->all();
        if (($payload['channel'] ?? null) === null && ($payload['type'] ?? null) !== null) {
            $payload['channel'] = $payload['type'];
        }

        if (array_key_exists('outcome', $payload) && $payload['outcome'] === '') {
            $payload['outcome'] = null;
        }

        $validated = Validator::make($payload, [
            'channel' => ['required', Rule::enum(FollowUpChannel::class)],
            'followup_type' => ['required', Rule::enum(FollowUpKind::class)],
            'occurred_at' => ['required', 'date'],
            'summary' => ['nullable', 'string', 'max:65535'],
            'notes' => ['nullable', 'string', 'max:65535'],
            'next_follow_up_at' => ['nullable', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'outcome' => ['nullable', Rule::enum(FollowUpOutcome::class)],
        ])->validate();

        $summary = $validated['notes'] ?? $validated['summary'] ?? null;

        if (! empty($validated['reminder_at']) && ! empty($validated['next_follow_up_at'])) {
            if (Carbon::parse($validated['reminder_at'])->gte(Carbon::parse($validated['next_follow_up_at']))) {
                throw ValidationException::withMessages([
                    'reminder_at' => [__('Reminder time must be before the next follow-up time.')],
                ]);
            }
        }

        $followUp = new ClientFollowUp;
        $followUp->client_id = $client->id;
        $followUp->channel = $this->enumOrString($validated['channel']);
        $followUp->followup_type = $this->enumOrString($validated['followup_type']);
        $followUp->outcome = isset($validated['outcome']) ? $this->enumOrString($validated['outcome']) : null;
        $followUp->occurred_at = Carbon::parse($validated['occurred_at']);
        $followUp->summary = $summary;
        $followUp->next_follow_up_at = ! empty($validated['next_follow_up_at'])
            ? Carbon::parse($validated['next_follow_up_at'])
            : null;
        $followUp->reminder_at = ! empty($validated['reminder_at'])
            ? Carbon::parse($validated['reminder_at'])
            : null;
        $followUp->created_by_id = $request->user()->id;
        $followUp->save();

        if (! empty($validated['reminder_at'])) {
            $reminderAt = Carbon::parse($validated['reminder_at']);
            if ($reminderAt->isFuture()) {
                SendClientFollowUpReminder::dispatch($followUp->id)->delay($reminderAt);
            }
        }

        return response()->json([
            'data' => $this->serializeFollowUp($followUp->fresh(['createdBy:id,name'])),
        ], 201);
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
