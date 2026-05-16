<?php

namespace App\Services;

use App\Models\Client;
use App\Models\PricingQuote;
use App\Models\Shipment;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SalesDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function buildForSalesUser(int $userId, ?string $completedPeriod = null, ?string $completedFrom = null, ?string $completedTo = null): array
    {
        $now = Carbon::now();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();

        [$completedFromDate, $completedToDate] = $this->resolveCompletedRange($completedPeriod, $completedFrom, $completedTo, $now);

        $shipmentsQuery = Shipment::query()->where('sales_rep_id', $userId);
        $allShipments = (clone $shipmentsQuery)->get(['id', 'status', 'selling_price_total', 'profit_total', 'created_at']);

        $activeCustomers = (int) Client::query()
            ->where('assigned_sales_id', $userId)
            ->count();

        $openShipments = $allShipments->filter(fn (Shipment $s) => ! $this->isShipmentCompleted($s->status))->count();

        $completedInRange = $allShipments->filter(function (Shipment $s) use ($completedFromDate, $completedToDate) {
            if (! $this->isShipmentCompleted($s->status)) {
                return false;
            }
            $created = $s->created_at ? Carbon::parse($s->created_at) : null;
            if (! $created) {
                return true;
            }

            return $created->between($completedFromDate, $completedToDate);
        })->count();

        $quotationsSentMonth = (int) PricingQuote::query()
            ->where('sales_user_id', $userId)
            ->whereBetween('created_at', [$monthStart, $monthEnd])
            ->count();

        $quotationsSentRange = (int) PricingQuote::query()
            ->where('sales_user_id', $userId)
            ->whereBetween('created_at', [$completedFromDate, $completedToDate])
            ->count();

        $convertedShipments = (int) Shipment::query()
            ->where('sales_rep_id', $userId)
            ->whereNotNull('pricing_quote_id')
            ->count();

        $convertedInRange = (int) Shipment::query()
            ->where('sales_rep_id', $userId)
            ->whereNotNull('pricing_quote_id')
            ->whereBetween('created_at', [$completedFromDate, $completedToDate])
            ->count();

        $conversionDenominator = max($quotationsSentRange, 1);
        $conversionRatePct = $quotationsSentRange > 0
            ? round($convertedInRange / $quotationsSentRange * 100, 1)
            : 0.0;

        $lifetimeConversionDenominator = max((int) PricingQuote::query()->where('sales_user_id', $userId)->count(), 1);
        $lifetimeConversionPct = round($convertedShipments / $lifetimeConversionDenominator * 100, 1);

        $totalRevenue = round((float) $allShipments->sum(fn (Shipment $s) => (float) ($s->selling_price_total ?? 0)), 2);
        $netProfit = round((float) $allShipments->sum(fn (Shipment $s) => (float) ($s->profit_total ?? 0)), 2);

        $monthlyRevenue = $this->monthlyShipmentMetrics($userId, 12);
        $quotationsByMonth = $this->quotationsByMonth($userId, 12);
        $conversionTrend = $this->conversionTrendByMonth($userId, 12);

        return [
            'kpis' => [
                'active_customers' => $activeCustomers,
                'open_shipments' => $openShipments,
                'completed_shipments' => $completedInRange,
                'completed_shipments_current_month' => $this->countCompletedInRange($allShipments, $monthStart, $monthEnd),
                'completed_shipments_last_2_months' => $this->countCompletedInRange(
                    $allShipments,
                    $now->copy()->subMonth()->startOfMonth(),
                    $monthEnd
                ),
                'quotations_sent_month' => $quotationsSentMonth,
                'quotations_sent_range' => $quotationsSentRange,
                'converted_shipments' => $convertedShipments,
                'converted_shipments_range' => $convertedInRange,
                'conversion_rate_pct' => $conversionRatePct,
                'conversion_rate_lifetime_pct' => $lifetimeConversionPct,
                'total_revenue' => $totalRevenue,
                'net_profit' => $netProfit,
            ],
            'completed_period' => [
                'key' => $completedPeriod ?: 'current_month',
                'from' => $completedFromDate->toDateString(),
                'to' => $completedToDate->toDateString(),
            ],
            'charts' => [
                'monthly_revenue_profit_line' => $monthlyRevenue,
                'quotations_sent_bar' => $quotationsByMonth,
                'conversion_rate_line' => $conversionTrend,
            ],
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveCompletedRange(?string $period, ?string $from, ?string $to, Carbon $now): array
    {
        if ($period === 'last_2_months') {
            return [$now->copy()->subMonth()->startOfMonth(), $now->copy()->endOfMonth()];
        }

        if ($period === 'custom' && $from && $to) {
            try {
                return [
                    Carbon::parse($from)->startOfDay(),
                    Carbon::parse($to)->endOfDay(),
                ];
            } catch (\Throwable) {
                // fall through
            }
        }

        return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
    }

    /**
     * @param  Collection<int, Shipment>  $shipments
     */
    private function countCompletedInRange(Collection $shipments, Carbon $from, Carbon $to): int
    {
        return $shipments->filter(function (Shipment $s) use ($from, $to) {
            if (! $this->isShipmentCompleted($s->status)) {
                return false;
            }
            $created = $s->created_at ? Carbon::parse($s->created_at) : null;

            return ! $created || $created->between($from, $to);
        })->count();
    }

    private function isShipmentCompleted(mixed $status): bool
    {
        if ($status === null || $status === '') {
            return false;
        }
        if (is_numeric($status)) {
            return (int) $status === 8;
        }
        $v = strtolower(trim((string) $status));
        if (in_array($v, ['delivered', 'completed', 'تم التسليم', 'شحنة مكتملة', 'مكتمل', 'مكتملة'], true)) {
            return true;
        }

        return str_contains($v, 'deliver') || str_contains($v, 'تسليم') || str_contains($v, 'مكتمل');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function monthlyShipmentMetrics(int $userId, int $months): array
    {
        $start = now()->copy()->subMonths($months - 1)->startOfMonth();
        $rows = Shipment::query()
            ->where('sales_rep_id', $userId)
            ->where('created_at', '>=', $start)
            ->get(['created_at', 'selling_price_total', 'profit_total']);

        $buckets = [];
        for ($i = 0; $i < $months; $i++) {
            $key = $start->copy()->addMonths($i)->format('Y-m');
            $buckets[$key] = ['month' => $key, 'revenue' => 0.0, 'profit' => 0.0, 'shipments' => 0];
        }

        foreach ($rows as $row) {
            $key = $row->created_at?->format('Y-m');
            if (! isset($buckets[$key])) {
                continue;
            }
            $buckets[$key]['revenue'] += (float) ($row->selling_price_total ?? 0);
            $buckets[$key]['profit'] += (float) ($row->profit_total ?? 0);
            $buckets[$key]['shipments']++;
        }

        return array_values(array_map(function (array $b) {
            $b['revenue'] = round($b['revenue'], 2);
            $b['profit'] = round($b['profit'], 2);

            return $b;
        }, $buckets));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function quotationsByMonth(int $userId, int $months): array
    {
        $start = now()->copy()->subMonths($months - 1)->startOfMonth();
        $quotes = PricingQuote::query()
            ->where('sales_user_id', $userId)
            ->where('created_at', '>=', $start)
            ->get(['created_at']);

        $buckets = [];
        for ($i = 0; $i < $months; $i++) {
            $key = $start->copy()->addMonths($i)->format('Y-m');
            $buckets[$key] = ['month' => $key, 'quotations' => 0];
        }

        foreach ($quotes as $quote) {
            $key = $quote->created_at?->format('Y-m');
            if (isset($buckets[$key])) {
                $buckets[$key]['quotations']++;
            }
        }

        return array_values($buckets);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function conversionTrendByMonth(int $userId, int $months): array
    {
        $start = now()->copy()->subMonths($months - 1)->startOfMonth();
        $quotes = PricingQuote::query()
            ->where('sales_user_id', $userId)
            ->where('created_at', '>=', $start)
            ->get(['id', 'created_at']);

        $converted = Shipment::query()
            ->where('sales_rep_id', $userId)
            ->whereNotNull('pricing_quote_id')
            ->where('created_at', '>=', $start)
            ->get(['pricing_quote_id', 'created_at']);

        $buckets = [];
        for ($i = 0; $i < $months; $i++) {
            $key = $start->copy()->addMonths($i)->format('Y-m');
            $buckets[$key] = ['month' => $key, 'quotations' => 0, 'converted' => 0, 'rate_pct' => 0.0];
        }

        foreach ($quotes as $quote) {
            $key = $quote->created_at?->format('Y-m');
            if (isset($buckets[$key])) {
                $buckets[$key]['quotations']++;
            }
        }

        foreach ($converted as $shipment) {
            $key = $shipment->created_at?->format('Y-m');
            if (isset($buckets[$key])) {
                $buckets[$key]['converted']++;
            }
        }

        return array_values(array_map(function (array $b) {
            $den = max((int) $b['quotations'], 1);
            $b['rate_pct'] = $b['quotations'] > 0
                ? round($b['converted'] / $den * 100, 1)
                : 0.0;

            return $b;
        }, $buckets));
    }
}
