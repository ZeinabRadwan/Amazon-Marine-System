<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TreasuryEntry;
use Illuminate\Http\Request;

class TreasuryEntryController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('financial.view'), 403);

        $query = TreasuryEntry::query()->with(['payment', 'createdBy']);

        if ($type = $request->query('entry_type')) {
            $query->where('entry_type', $type);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('entry_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('entry_date', '<=', $to);
        }

        $entries = $query->orderByDesc('entry_date')->get();

        return response()->json([
            'data' => $entries,
        ]);
    }
}

