<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AbilitiesController extends Controller
{
    /**
     * List all Spatie permission names grouped by domain (for permission page).
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        abort_unless($request->user()?->can('permissions.view'), 403);

        $groups = config('permissions.groups', []);

        return response()->json([
            'data' => $groups,
        ]);
    }
}
