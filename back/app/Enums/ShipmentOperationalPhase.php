<?php

namespace App\Enums;

enum ShipmentOperationalPhase: string
{
    case DocReview = 'doc_review';
    case ContainerAllocation = 'container_allocation';
    case LoadingInProgress = 'loading_in_progress';
    case CustomsProceduresDone = 'customs_procedures_done';
    case AwaitingDraftBl = 'awaiting_draft_bl';
    case PreparingShipmentDocs = 'preparing_shipment_docs';
    case VesselSailed = 'vessel_sailed';
    case AwaitingClientPayment = 'awaiting_client_payment';
    case BankPaymentInProgress = 'bank_payment_in_progress';
    case CustomsReleaseInProgress = 'customs_release_in_progress';
    case CustomsReleased = 'customs_released';
    case ShipmentComplete = 'shipment_complete';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
