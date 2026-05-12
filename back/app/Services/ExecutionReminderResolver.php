<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Resolves reminder fire time for shipment operation tasks using the same rules as
 * {@see \App\Http\Controllers\Api\V1\ClientFollowUpController} (absolute vs before-event).
 */
class ExecutionReminderResolver
{
    /**
     * @param  array<string, mixed>  $validated  Must include execution_at when using relative reminder
     * @return array{0: ?Carbon, 1: ?int, 2: ?string}
     */
    public static function resolve(array $validated): array
    {
        $hasAbsolute = ! empty($validated['reminder_at']);
        $hasRelative = ! empty($validated['reminder_before_value']) && ! empty($validated['reminder_before_unit']);

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

        $unit = (string) $validated['reminder_before_unit'];
        $reminderAt = match ($unit) {
            'minute', 'minutes' => $execution->copy()->subMinutes($value),
            'hour', 'hours' => $execution->copy()->subHours($value),
            'day', 'days' => $execution->copy()->subDays($value),
            default => throw ValidationException::withMessages([
                'reminder_before_unit' => [__('Invalid reminder unit.')],
            ]),
        };

        $normalizedUnit = match ($unit) {
            'minutes' => 'minute',
            'hours' => 'hour',
            'days' => 'day',
            default => $unit,
        };

        return [$reminderAt, $value, $normalizedUnit];
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
