<?php

namespace App\Enums;

enum FollowUpKind: string
{
    case ColdCall = 'cold_call';
    case Consultation = 'consultation';
    case PriceFollowup = 'price_followup';
    case CollectionFollowup = 'collection_followup';
    case ShipmentFollowup = 'shipment_followup';
    case Other = 'other';
}
