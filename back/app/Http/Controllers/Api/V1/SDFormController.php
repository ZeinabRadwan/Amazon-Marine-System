<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSDFormRequest;
use App\Http\Requests\SubmitSDFormRequest;
use App\Http\Requests\UpdateSDFormRequest;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Services\ActivityLogger;
use App\Services\SDFormService;
use Illuminate\Http\Request;

class SDFormController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', SDForm::class);

        $query = SDForm::query()
            ->with(['client', 'salesRep', 'pol', 'pod']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($salesRepId = $request->query('sales_rep_id')) {
            $query->where('sales_rep_id', $salesRepId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('sd_number', 'like', '%' . $search . '%')
                    ->orWhere('cargo_description', 'like', '%' . $search . '%');
            });
        }

        $forms = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $forms,
        ]);
    }

    public function store(StoreSDFormRequest $request)
    {
        $data = $request->validated();

        $form = new SDForm($data);
        $form->sd_number = SDFormService::generateNumber();
        $form->status = $data['status'] ?? 'draft';
        $form->sales_rep_id = $data['sales_rep_id'] ?? $request->user()->id;
        $form->save();

        ActivityLogger::log('sd_form.created', $form, [
            'sd_number' => $form->sd_number,
        ]);

        return response()->json([
            'data' => $form->fresh(['client', 'salesRep', 'pol', 'pod']),
        ], 201);
    }

    public function show(SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        return response()->json([
            'data' => $sdForm->load(['client', 'salesRep', 'pol', 'pod', 'linkedShipment']),
        ]);
    }

    public function update(UpdateSDFormRequest $request, SDForm $sdForm)
    {
        $this->authorize('update', $sdForm);

        $original = $sdForm->getOriginal();

        $sdForm->fill($request->validated());
        $sdForm->save();

        ActivityLogger::log('sd_form.updated', $sdForm, [
            'before' => $original,
            'after' => $sdForm->getChanges(),
        ]);

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod']),
        ]);
    }

    public function submit(SubmitSDFormRequest $request, SDForm $sdForm)
    {
        $this->authorize('update', $sdForm);

        $data = $request->validated();

        if (array_key_exists('shipment_direction', $data)) {
            $sdForm->shipment_direction = $data['shipment_direction'];
        }

        if (array_key_exists('acid_number', $data)) {
            $sdForm->acid_number = $data['acid_number'];
        }

        $sdForm->save();

        SDFormService::transitionStatus($sdForm, 'submitted');

        ActivityLogger::log('sd_form.submitted', $sdForm, [
            'status' => $sdForm->status,
        ]);

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod']),
        ]);
    }

    public function linkShipment(Request $request, SDForm $sdForm)
    {
        $this->authorize('update', $sdForm);

        $validated = $request->validate([
            'shipment_id' => ['required', 'integer', 'exists:shipments,id'],
        ]);

        /** @var Shipment $shipment */
        $shipment = Shipment::findOrFail($validated['shipment_id']);

        $sdForm->linked_shipment_id = $shipment->id;
        $sdForm->save();

        ActivityLogger::log('sd_form.linked_shipment', $sdForm, [
            'shipment_id' => $shipment->id,
        ]);

        return response()->json([
            'data' => $sdForm->fresh('linkedShipment'),
        ]);
    }
}

