<?php

namespace App\Services;

use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function __construct(
        private AppSettings $settings,
    ) {
    }

    /**
     * @param  iterable<User>  $recipients
     */
    public function sendDatabaseNotification(string $eventKey, ?Model $entity, iterable $recipients, Notification $notification): void
    {
        if (! $this->isEventEnabledForChannel($eventKey, 'database')) {
            return;
        }

        foreach ($recipients as $recipient) {
            if (! $recipient instanceof User) {
                continue;
            }

            $log = $this->createLog($eventKey, $entity, $recipient, 'database');

            try {
                $recipient->notify($notification);

                $log->status = 'sent';
                $log->sent_at = now();
                $log->save();
            } catch (\Throwable $e) {
                $log->status = 'failed';
                $log->error_message = $e->getMessage();
                $log->save();

                Log::error('Failed to send database notification', [
                    'event_key' => $eventKey,
                    'recipient_id' => $recipient->getKey(),
                    'exception' => $e,
                ]);
            }
        }
    }

    /**
     * @param  iterable<User>  $recipients
     * @param  callable(User):void  $callback
     */
    public function sendEmail(string $eventKey, ?Model $entity, iterable $recipients, callable $callback): int
    {
        $sentCount = 0;
        if (! $this->isEventEnabledForChannel($eventKey, 'email')) {
            return 0;
        }

        foreach ($recipients as $recipient) {
            if (! $recipient instanceof User) {
                continue;
            }

            if ($recipient->email === null || $recipient->email === '') {
                continue;
            }

            $log = $this->createLog($eventKey, $entity, $recipient, 'email', [
                'email' => $recipient->email,
            ]);

            try {
                $callback($recipient);

                $sentCount++;
                $log->status = 'sent';
                $log->sent_at = now();
                $log->save();
            } catch (\Throwable $e) {
                $log->status = 'failed';
                $log->error_message = $e->getMessage();
                $log->save();

                Log::error('Failed to send email notification', [
                    'event_key' => $eventKey,
                    'recipient_id' => $recipient->getKey(),
                    'exception' => $e,
                ]);
            }
        }

        return $sentCount;
    }

    private function createLog(string $eventKey, ?Model $entity, ?User $recipient, string $channel, array $extraPayload = []): NotificationLog
    {
        $payload = $extraPayload;

        if ($entity !== null) {
            $payload['entity_class'] = $entity->getMorphClass();
            $payload['entity_id'] = $entity->getKey();
        }

        return NotificationLog::query()->create([
            'event_key' => $eventKey,
            'causer_id' => Auth::id(),
            'notifiable_type' => $entity?->getMorphClass(),
            'notifiable_id' => $entity?->getKey(),
            'recipient_id' => $recipient?->getKey(),
            'channel' => $channel,
            'status' => 'pending',
            'payload' => $payload,
        ]);
    }

    private function isEventEnabledForChannel(string $eventKey, string $channel): bool
    {
        $prefs = $this->settings->getArray(AppSettings::KEY_NOTIFICATIONS_PREFERENCES) ?? [];

        if ($channel === 'email' && array_key_exists('email', $prefs) && $prefs['email'] === false) {
            return false;
        }

        if ($this->isShipmentEvent($eventKey) && array_key_exists('shipments', $prefs) && $prefs['shipments'] === false) {
            return false;
        }

        if ($this->isFinanceEvent($eventKey) && array_key_exists('finance', $prefs) && $prefs['finance'] === false) {
            return false;
        }

        if ($this->isCrmEvent($eventKey) && array_key_exists('crm', $prefs) && $prefs['crm'] === false) {
            return false;
        }

        return true;
    }

    private function isShipmentEvent(string $eventKey): bool
    {
        return str_starts_with($eventKey, 'sd_form.')
            || str_starts_with($eventKey, 'shipment.');
    }

    private function isFinanceEvent(string $eventKey): bool
    {
        return str_starts_with($eventKey, 'invoice.')
            || str_starts_with($eventKey, 'vendor_bill.')
            || str_starts_with($eventKey, 'treasury.');
    }

    private function isCrmEvent(string $eventKey): bool
    {
        return str_starts_with($eventKey, 'client_follow_up.')
            || str_starts_with($eventKey, 'crm.');
    }
}

