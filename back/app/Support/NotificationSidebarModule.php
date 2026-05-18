<?php

namespace App\Support;

/**
 * Maps in-app notification payload types to sidebar / page module keys.
 */
class NotificationSidebarModule
{
    /** @var array<string, string> */
    private const TYPE_PREFIX_TO_MODULE = [
        'client_follow_up' => 'clients',
        'sd_form' => 'sd_forms',
        'shipment_financials' => 'shipments',
        'shipment' => 'shipments',
        'excuse' => 'attendance',
    ];

    /** @var array<string, string> */
    private const LARAVEL_CLASS_TO_MODULE = [
        'OperationSDFormNotification' => 'sd_forms',
        'SdFormBookingConfirmationUploadedNotification' => 'sd_forms',
        'SdFormInformationRequestedNotification' => 'sd_forms',
        'SdFormInformationCompletedNotification' => 'sd_forms',
        'ShipmentSalesFinancialsNotification' => 'shipments',
        'ShipmentOperationTaskReminderNotification' => 'shipments',
        'ShipmentFinancialsCompleted' => 'shipments',
        'ClientFollowUpReminderNotification' => 'clients',
        'ExcuseDecisionNotification' => 'attendance',
    ];

    public static function resolve(?string $payloadType, ?string $laravelNotificationClass = null): ?string
    {
        $type = trim((string) $payloadType);
        if ($type !== '') {
            foreach (self::TYPE_PREFIX_TO_MODULE as $prefix => $module) {
                if ($type === $prefix || str_starts_with($type, $prefix.'.')) {
                    return $module;
                }
            }
        }

        if ($laravelNotificationClass) {
            $short = class_basename($laravelNotificationClass);
            if (isset(self::LARAVEL_CLASS_TO_MODULE[$short])) {
                return self::LARAVEL_CLASS_TO_MODULE[$short];
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public static function acknowledgeableModules(): array
    {
        return [
            'clients',
            'sd_forms',
            'shipments',
            'customer_service',
            'attendance',
            'pricing',
            'dashboard',
        ];
    }
}
