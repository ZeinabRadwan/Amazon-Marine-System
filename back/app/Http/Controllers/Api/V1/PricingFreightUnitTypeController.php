<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PricingFreightUnitType;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PricingFreightUnitTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $this->freightUnitTypesTableAvailable()) {
            return $this->catalogUnavailableIndexResponse();
        }

        try {
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
        } catch (QueryException $e) {
            if ($this->isMissingFreightUnitTypesTable($e)) {
                return $this->catalogUnavailableIndexResponse();
            }

            throw $e;
        }
    }

    public function store(Request $request): JsonResponse
    {
        if (! $this->freightUnitTypesTableAvailable()) {
            return $this->catalogUnavailableMutationResponse();
        }

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

        $meta = $validated['meta'] ?? [];
        if ($dataset === 'ocean_container') {
            $inferred = $this->inferOceanContainerMetaFromLabel($validated['label']);
            $meta = [
                'type' => ! empty($meta['type']) ? $meta['type'] : $inferred['type'],
                'size' => ! empty($meta['size']) ? $meta['size'] : $inferred['size'],
                'height' => ! empty($meta['height']) ? $meta['height'] : $inferred['height'],
            ];
        }

        $slugInput = isset($validated['slug']) ? trim((string) $validated['slug']) : '';
        $slug = $slugInput !== ''
            ? Str::lower($slugInput)
            : $this->generateUniqueSlug($dataset, $validated['label']);

        try {
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
                'meta' => $dataset === 'ocean_container' ? $meta : ($validated['meta'] ?? null),
            ]);

            return response()->json(['data' => $row], 201);
        } catch (QueryException $e) {
            if ($this->isMissingFreightUnitTypesTable($e)) {
                return $this->catalogUnavailableMutationResponse();
            }

            if ($this->isDuplicateKeyOrUniqueViolation($e)) {
                return response()->json([
                    'message' => 'A freight unit type with this identifier already exists for this catalog.',
                    'error' => 'duplicate_entry',
                ], 422);
            }

            return response()->json([
                'message' => 'Could not save freight unit type. Check the label and try again.',
                'error' => 'catalog_write_failed',
            ], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (! $this->freightUnitTypesTableAvailable()) {
            return $this->catalogUnavailableMutationResponse();
        }

        $pricingFreightUnitType = PricingFreightUnitType::query()->find($id);
        if (! $pricingFreightUnitType) {
            abort(404);
        }

        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:255'],
            'meta' => ['sometimes', 'nullable', 'array'],
            'meta.type' => ['nullable', 'string', 'in:Dry,Reefer'],
            'meta.size' => ['nullable', 'string', 'in:20,40'],
            'meta.height' => ['nullable', 'string', 'in:Standard,HQ'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'active' => ['sometimes', 'boolean'],
        ]);

        try {
            $pricingFreightUnitType->update($validated);

            return response()->json(['data' => $pricingFreightUnitType->fresh()]);
        } catch (QueryException $e) {
            if ($this->isMissingFreightUnitTypesTable($e)) {
                return $this->catalogUnavailableMutationResponse();
            }

            throw $e;
        }
    }

    /**
     * Derive ocean equipment meta from a single human-readable label (no separate UI fields required).
     *
     * @return array{type: string, size: string, height: string}
     */
    private function inferOceanContainerMetaFromLabel(string $label): array
    {
        $lower = mb_strtolower(trim($label), 'UTF-8');

        $type = 'Dry';
        if (preg_match('/\b(reefer|reefers|rf\b|rfr|مبرد)\b/u', $lower)) {
            $type = 'Reefer';
        }

        $size = '40';
        if (preg_match("/\b20\b|(^|[^0-9])20['′`´]|\b20\s*(ft|foot|feet|'|′)?\b/u", $lower)) {
            $size = '20';
        }

        $height = 'Standard';
        if (preg_match('/\b(hq|hc|high[\s-]?cube|highcube|هاي|هاي كيوب)\b/u', $lower)) {
            $height = 'HQ';
        }

        return [
            'type' => $type,
            'size' => $size,
            'height' => $height,
        ];
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
        try {
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
        } catch (QueryException $e) {
            if ($this->isMissingFreightUnitTypesTable($e)) {
                return $slug;
            }

            throw $e;
        }

        return $slug;
    }

    /**
     * True when the catalog table exists and is reachable (migration has been applied).
     */
    private function freightUnitTypesTableAvailable(): bool
    {
        try {
            return Schema::hasTable('pricing_freight_unit_types');
        } catch (\Throwable) {
            return false;
        }
    }

    private function isMissingFreightUnitTypesTable(QueryException $e): bool
    {
        $msg = $e->getMessage();

        return str_contains($msg, 'pricing_freight_unit_types')
            || str_contains($msg, 'Base table or view not found')
            || str_contains($msg, 'Unknown table')
            || str_contains($msg, 'no such table');
    }

    private function isDuplicateKeyOrUniqueViolation(QueryException $e): bool
    {
        $msg = $e->getMessage();
        if (str_contains($msg, 'Duplicate entry') || str_contains($msg, 'UNIQUE constraint failed')) {
            return true;
        }
        $code = $e->getCode();
        if ($code === '23000' || $code === 23000) {
            return true;
        }
        $sqlState = $e->errorInfo[0] ?? null;
        if ($sqlState === '23000') {
            return true;
        }
        $driverCode = isset($e->errorInfo[1]) ? (int) $e->errorInfo[1] : 0;
        if (in_array($driverCode, [1062, 19], true)) {
            return true;
        }

        return false;
    }

    private function catalogUnavailableIndexResponse(): JsonResponse
    {
        return response()->json([
            'data' => [],
            'meta' => [
                'catalog_available' => false,
                'message' => 'Freight unit type catalog is not available. Run database migrations.',
            ],
        ]);
    }

    private function catalogUnavailableMutationResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'Freight unit type catalog is not available. Run database migrations.',
            'error' => 'catalog_unavailable',
        ], 503);
    }
}
