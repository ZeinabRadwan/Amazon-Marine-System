<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PdfLayout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PdfLayoutController extends Controller
{
    public function show(Request $request, string $documentType): JsonResponse
    {
        $layout = PdfLayout::where('document_type', $documentType)->first();

        return response()->json([
            'data' => $layout,
        ]);
    }

    public function upsert(Request $request, string $documentType): JsonResponse
    {
        $validated = $request->validate([
            'header_html' => ['sometimes', 'nullable', 'string'],
            'footer_html' => ['sometimes', 'nullable', 'string'],
        ]);

        $layout = PdfLayout::firstOrNew(['document_type' => $documentType]);
        $layout->fill($validated);
        $layout->save();

        return response()->json([
            'data' => $layout->fresh(),
        ]);
    }
}

