<?php

namespace App\Enums;

enum FollowUpOutcome: string
{
    case NoAnswer = 'no_answer';
    case Contacted = 'contacted';
    case Interested = 'interested';
    case NotInterested = 'not_interested';
    case PriceRequested = 'price_requested';
    case Postponed = 'postponed';
    case DealDone = 'deal_done';
    case NeedsFollowup = 'needs_followup';
}
