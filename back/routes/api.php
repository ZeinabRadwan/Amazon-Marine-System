<?php

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

// Health check for the React frontend
Route::get('/health', function (): JsonResponse {
    return response()->json([
        'status' => 'ok',
        'message' => 'Amazon Marine API',
        'timestamp' => now()->toIso8601String(),
    ]);
});
