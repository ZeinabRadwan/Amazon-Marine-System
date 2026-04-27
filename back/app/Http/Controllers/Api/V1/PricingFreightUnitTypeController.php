<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PricingFreightUnitType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PricingFreightUnitTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PricingFreightUnitType::query()->where('active', true);

        $dataset = $request->query('dataset');
        if (is_string($dataset) && $dataset !== '') {
            $query->where('dataset', $dataset);
        }

        if ($search = $request->query('q')) {
            $query->where('label', 'like', '%'.$search.'%');
        }

        $items = $query->orderBy('sort_order')->orderBy('label')->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dataset' => ['required', 'string', 'in:ocean_container,inland_truck'],
            'label' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:80',
                'regex:/^[a-z0-9][a-z0-9_-]*$/i',
            ],
            'meta' => ['nullable', 'array'],
            'meta.type' => ['nullable', 'string', 'in:Dry,Reefer'],
            'meta.size' => ['nullable', 'string', 'in:20,40'],
            'meta.height' => ['nullable', 'string', 'in:Standard,HQ'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $dataset = $validated['dataset'];

        if ($dataset === 'ocean_container') {
            if (
                empty($validated['meta']['type'])
                || empty($validated['meta']['size'])
                || empty($validated['meta']['height'])
            ) {
                abort(422, 'Ocean container types require meta.type, meta.size, and meta.height.');
            }
        }

        $slugInput = isset($validated['slug']) ? trim((string) $validated['slug']) : '';
        $slug = $slugInput !== ''
            ? Str::lower($slugInput)
            : $this->generateUniqueSlug($dataset, $validated['label']);

        if (
            PricingFreightUnitType::query()
                ->where('dataset', $dataset)
                ->where('slug', $slug)
                ->exists()
        ) {
            abort(422, 'This slug is already used for this dataset.');
        }

        $row = PricingFreightUnitType::create([
            'dataset' => $dataset,
            'slug' => $slug,
            'label' => $validated['label'],
            'sort_order' => $validated['sort_order'] ?? 1000,
            'active' => $validated['active'] ?? true,
            'meta' => $validated['meta'] ?? null,
        ]);

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, PricingFreightUnitType $pricingFreightUnitType): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:255'],
            'meta' => ['sometimes', 'nullable', 'array'],
            'meta.type' => ['nullable', 'string', 'in:Dry,Reefer'],
            'meta.size' => ['nullable', 'string', 'in:20,40'],
            'meta.height' => ['nullable', 'string', 'in:Standard,HQ'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $pricingFreightUnitType->update($validated);

        return response()->json(['data' => $pricingFreightUnitType->fresh()]);
    }

    /**
     * Inland truck: pricing JSON key. Ocean: preset slug.
     */
    private function generateUniqueSlug(string $dataset, string $label): string
    {
        $base = Str::slug($label) ?: 'type';
        if ($base === '') {
            $base = 'type';
        }
        $base = Str::limit($base, 60, '');

        $slug = $base;
        $n = 0;
        while (
            PricingFreightUnitType::query()
                ->where('dataset', $dataset)
                ->where('slug', $slug)
                ->exists()
        ) {
            $n++;
            $suffix = '-'.$n;
            $slug = Str::limit($base, 80 - strlen($suffix), '').$suffix;
        }

        return $slug;
    }
}
