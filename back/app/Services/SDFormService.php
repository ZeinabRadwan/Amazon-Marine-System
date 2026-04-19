<?php

namespace App\Services;

use App\Models\SDForm;
use Illuminate\Support\Facades\DB;

class SDFormService
{
    /**
     * Generate a new SD number in the format SD-YYYY-XXXX.
     */
    public static function generateNumber(): string
    {
        $year = now()->year;

        return (string) DB::transaction(function () use ($year) {
            $lastForYear = SDForm::whereYear('created_at', $year)
                ->orderByDesc('id')
                ->first();

            $nextSequence = 1;

            if ($lastForYear && preg_match('/^SD-'.$year.'-(\d{4})$/', (string) $lastForYear->sd_number, $matches)) {
                $nextSequence = ((int) $matches[1]) + 1;
            }

            return sprintf('SD-%d-%04d', $year, $nextSequence);
        });
    }

    /**
     * Enforce valid status transitions on an SD form.
     */
    public static function transitionStatus(SDForm $form, string $toStatus): void
    {
        $from = $form->status;

        $allowedTransitions = [
            'draft' => ['submitted', 'sent_to_operations', 'cancelled'],
            'submitted' => ['sent_to_operations', 'cancelled'],
            'sent_to_operations' => ['in_progress', 'cancelled'],
            'in_progress' => ['completed', 'cancelled'],
            'completed' => [],
            'cancelled' => [],
        ];

        $fromKey = $from ?? 'draft';

        if (! array_key_exists($fromKey, $allowedTransitions)) {
            abort(422, __('Invalid SD form status: :status', ['status' => $fromKey]));
        }

        if (! in_array($toStatus, $allowedTransitions[$fromKey], true)) {
            abort(422, __('Transition from :from to :to is not allowed.', [
                'from' => $fromKey,
                'to' => $toStatus,
            ]));
        }

        $form->status = $toStatus;
        $form->save();
    }
}
