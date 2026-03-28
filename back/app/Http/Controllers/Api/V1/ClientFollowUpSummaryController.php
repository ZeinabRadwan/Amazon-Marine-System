<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientFollowUp;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientFollowUpSummaryController extends Controller
{
    /**
     * Follow-up workload for the current user (assigned clients + unassigned clients they logged).
     */
    public function show(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Client::class);

        $user = $request->user();
        $now = Carbon::now();
        $today = $now->toDateString();

        $base = ClientFollowUp::query()
            ->forSalespersonPortfolio($user->id)
            ->whereNotNull('next_follow_up_at')
            ->where(function ($q) {
                $q->whereNull('outcome')
                    ->orWhereNotIn('outcome', ['deal_done', 'not_interested']);
            })
            ->with(['client:id,name,company_name,assigned_sales_id']);

        $upcoming = (clone $base)
            ->where('next_follow_up_at', '>', $now)
            ->orderBy('next_follow_up_at')
            ->limit(80)
            ->get();

        $dueToday = (clone $base)
            ->whereDate('next_follow_up_at', $today)
            ->orderBy('next_follow_up_at')
            ->limit(80)
            ->get();

        $overdue = (clone $base)
            ->where('next_follow_up_at', '<', $now)
            ->orderBy('next_follow_up_at')
            ->limit(80)
            ->get();

        return response()->json([
            'data' => [
                'upcoming' => $upcoming->map(fn (ClientFollowUp $f) => $this->serializeRow($f)),
                'due_today' => $dueToday->map(fn (ClientFollowUp $f) => $this->serializeRow($f)),
                'overdue' => $overdue->map(fn (ClientFollowUp $f) => $this->serializeRow($f)),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializeRow(ClientFollowUp $f): array
    {
        $c = $f->client;

        return [
            'id' => $f->id,
            'client_id' => $f->client_id,
            'client_name' => $c ? ($c->company_name ?: $c->name) : null,
            'channel' => $f->channel,
            'followup_type' => $f->followup_type,
            'outcome' => $f->outcome,
            'occurred_at' => $f->occurred_at?->toIso8601String(),
            'next_follow_up_at' => $f->next_follow_up_at?->toIso8601String(),
            'reminder_at' => $f->reminder_at?->toIso8601String(),
        ];
    }
}
