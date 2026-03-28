<?php

namespace App\Enums;

enum FollowUpChannel: string
{
    case Phone = 'phone';
    case Whatsapp = 'whatsapp';
    case Email = 'email';
    case Visit = 'visit';
    case Meeting = 'meeting';
}
