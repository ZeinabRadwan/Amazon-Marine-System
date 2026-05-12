<?php

namespace App\Services;

use App\Http\Controllers\Api\V1\ClientFollowUpController;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Resolves reminder fire time for shipment operation tasks using the same rules as
 * {@see ClientFollowUpController} (absolute vs before-event).
 */
class ExecutionReminderResolver
{
    /**
     * @param  array<string, mixed>  $validated  Uses execution_at, reminder_at, reminder_before_*
     * @return array{0: ?Carbon, 1: ?int, 2: ?string}
     */
    public static function resolve(array $validated): array
    {
        $hasAbsolute = ! empty($validated['reminder_at']);
        $unit = self::normalizeUnit($validated['reminder_before_unit'] ?? null);
        $hasRelative = ! empty($validated['reminder_before_value']) && $unit !== null;

        if ($hasAbsolute && $hasRelative) {
            throw ValidationException::withMessages([
                'reminder_at' => [__('Choose either a reminder time or a relative reminder, not both.')],
            ]);
        }

        if (! $hasAbsolute && ! $hasRelative) {
            return [null, null, null];
        }

        if ($hasAbsolute) {
            return [Carbon::parse($validated['reminder_at']), null, null];
        }

        if (empty($validated['execution_at'])) {
            throw ValidationException::withMessages([
                'execution_at' => [__('Execution date and time are required when using a reminder before that time.')],
            ]);
        }

        $execution = Carbon::parse($validated['execution_at']);
        $value = (int) $validated['reminder_before_value'];
        if ($value < 1) {
            throw ValidationException::withMessages([
                'reminder_before_value' => [__('Enter a positive number.')],
            ]);
        }

        $reminderAt = match ($unit) {
            'minute' => $execution->copy()->subMinutes($value),
            'hour' => $execution->copy()->subHours($value),
            'day' => $execution->copy()->subDays($value),
            default => throw ValidationException::withMessages([
                'reminder_before_unit' => [__('Invalid reminder unit.')],
            ]),
        };

        return [$reminderAt, $value, $unit];
    }

    public static function validateReminderBeforeExecution(?Carbon $reminderAt, ?Carbon $executionAt): void
    {
        if ($reminderAt && $executionAt && $reminderAt->gte($executionAt)) {
            throw ValidationException::withMessages([
                'reminder_at' => [__('Reminder time must be before the execution time.')],
            ]);
        }
    }

    /**
     * @return 'minute'|'hour'|'day'|null
     */
    public static function normalizeUnit(?string $unit): ?string
    {
        if ($unit === null || $unit === '') {
            return null;
        }

        return match ($unit) {
            'minute', 'minutes' => 'minute',
            'hour', 'hours' => 'hour',
            'day', 'days' => 'day',
            default => null,
        };
    }
}
