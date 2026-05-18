<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientFollowUp;
use App\Models\User;
use App\Support\NotificationSidebarModule;
use Carbon\Carbon;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Cache;

class SidebarActivityService
{
    private const ACK_TTL_SECONDS = 60 * 60 * 24 * 90;

    /**
     * Unread / pending activity counts per sidebar module (not total records).
     *
     * @return array<string, int>
     */
    public function badgesFor(User $user): array
    {
        $badges = array_fill_keys(
            ['clients', 'sd_forms', 'shipments', 'customer_service', 'attendance', 'pricing'],
            0
        );

        foreach ($this->unreadNotificationCountsByModule($user) as $module => $count) {
            if (array_key_exists($module, $badges)) {
                $badges[$module] += $count;
            } else {
                $badges[$module] = $count;
            }
        }

        $badges['clients'] += $this->clientFollowUpActionCount($user);

        return $badges;
    }

    public function acknowledge(User $user, string $module): void
    {
        $module = trim($module);
        if (! in_array($module, NotificationSidebarModule::acknowledgeableModules(), true)) {
            return;
        }

        Cache::put($this->ackCacheKey($user->id, $module), now(), self::ACK_TTL_SECONDS);
    }

    /**
     * @return array<string, int>
     */
    private function unreadNotificationCountsByModule(User $user): array
    {
        $counts = [];

        $user->unreadNotifications()
            ->get(['id', 'type', 'data'])
            ->each(function (DatabaseNotification $notification) use (&$counts) {
                $data = is_array($notification->data) ? $notification->data : [];
                $payloadType = isset($data['type']) ? (string) $data['type'] : '';
                $module = NotificationSidebarModule::resolve($payloadType, $notification->type);
                if ($module === null) {
                    return;
                }
                $counts[$module] = ($counts[$module] ?? 0) + 1;
            });

        return $counts;
    }

    private function clientFollowUpActionCount(User $user): int
    {
        $user->loadMissing('roles');
        $roleNames = $user->roles->pluck('name')->all();
        $isSalesRole = in_array('sales', $roleNames, true) || in_array('sales_manager', $roleNames, true);

        if (! $isSalesRole && ! $user->can('clients.view') && ! $user->can('pricing.view_client_pricing')) {
            return 0;
        }

        $ack = Cache::get($this->ackCacheKey($user->id, 'clients'));
        $ackAt = $ack instanceof Carbon ? $ack : ($ack ? Carbon::parse($ack) : null);

        $now = Carbon::now();
        $today = $now->toDateString();

        $query = ClientFollowUp::query()
            ->forSalespersonPortfolio($user->id)
            ->whereNotNull('next_follow_up_at')
            ->where(function ($q) {
                $q->whereNull('outcome')
                    ->orWhereNotIn('outcome', ['deal_done', 'not_interested']);
            })
            ->where(function ($q) use ($now, $today) {
                $q->where('next_follow_up_at', '<', $now)
                    ->orWhereDate('next_follow_up_at', $today);
            });

        if ($ackAt) {
            $query->where(function ($q) use ($ackAt) {
                $q->where('updated_at', '>', $ackAt)
                    ->orWhere('created_at', '>', $ackAt);
            });
        }

        return (int) $query->count();
    }

    private function ackCacheKey(int $userId, string $module): string
    {
        return "sidebar_activity_ack:{$userId}:{$module}";
    }

    /**
     * Legacy sidebar prop keys used by the React layout.
     *
     * @param  array<string, int>  $badges
     * @return array<string, int>
     */
    public function legacyPropsFromBadges(array $badges): array
    {
        return [
            'crmCount' => (int) ($badges['clients'] ?? 0),
            'sdFormsCount' => (int) ($badges['sd_forms'] ?? 0),
            'shipmentsCount' => (int) ($badges['shipments'] ?? 0),
            'ticketsCount' => (int) ($badges['customer_service'] ?? 0),
        ];
    }
}
