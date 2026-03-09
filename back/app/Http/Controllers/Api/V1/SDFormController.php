<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSDFormRequest;
use App\Http\Requests\SubmitSDFormRequest;
use App\Http\Requests\UpdateSDFormRequest;
use App\Models\Client;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use App\Notifications\OperationSDFormNotification;
use App\Services\ActivityLogger;
use App\Services\SDFormService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Barryvdh\DomPDF\Facade\Pdf;

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

        $sort = $request->query('sort', 'date');
        $direction = strtolower($request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sdFormsTable = (new SDForm())->getTable();

        if ($sort === 'client') {
            $query->orderBy(
                Client::select('name')
                    ->whereColumn('clients.id', $sdFormsTable . '.client_id'),
                $direction
            );
        } else {
            $sortColumn = match ($sort) {
                'sd' => 'sd_number',
                'date' => 'created_at',
                default => 'created_at',
            };

            $query->orderBy($sortColumn, $direction);
        }

        $perPage = $request->integer('per_page', 15);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()->map(fn (SDForm $form) => $this->transformSDForm($form)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
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

    public function destroy(SDForm $sdForm)
    {
        $this->authorize('delete', $sdForm);

        $sdForm->delete();

        ActivityLogger::log('sd_form.deleted', $sdForm, [
            'sd_number' => $sdForm->sd_number,
        ]);

        return response()->json([
            'message' => 'SD form deleted.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformSDForm(SDForm $form): array
    {
        return [
            'id' => $form->id,
            'sd_number' => $form->sd_number,
            'client_id' => $form->client_id,
            'client_name' => $form->client?->name ?? '',
            'pol' => $form->pol?->name ?? $form->pol_text,
            'pod' => $form->pod?->name ?? $form->pod_text,
            'final_destination' => $form->final_destination,
            'cargo_description' => $form->cargo_description,
            'sales_rep_id' => $form->sales_rep_id,
            'sales_rep_name' => $form->salesRep?->name ?? '',
            'status' => $form->status,
            'shipment_direction' => $form->shipment_direction,
            'num_containers' => $form->num_containers,
            'container_type' => $form->container_type,
            'container_size' => $form->container_size,
            'requested_vessel_date' => $form->requested_vessel_date?->toDateString(),
            'created_at' => $form->created_at?->toIso8601String(),
        ];
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

    public function sendToOperations(Request $request, SDForm $sdForm)
    {
        $this->authorize('update', $sdForm);

        SDFormService::transitionStatus($sdForm, 'sent_to_operations');

        ActivityLogger::log('sd_form.sent_to_operations', $sdForm, [
            'status' => $sdForm->status,
        ]);

        $operationsUsers = User::role('operation')
            ->where('status', 'active')
            ->get();

        foreach ($operationsUsers as $user) {
            $user->notify(new OperationSDFormNotification($sdForm));
        }

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod']),
        ]);
    }

    public function export(Request $request)
    {
        $this->authorize('viewAny', SDForm::class);

        $query = SDForm::query()->with(['client', 'salesRep', 'pol', 'pod']);

        $ids = $request->query('ids');
        if (is_array($ids) && count($ids) > 0) {
            $query->whereIn('id', $ids);
        } elseif (is_string($ids)) {
            $ids = array_filter(array_map('intval', explode(',', $ids)));
            if (count($ids) > 0) {
                $query->whereIn('id', $ids);
            }
        }

        $forms = $query->orderBy('created_at', 'desc')->get();
        $rows = $forms->map(fn (SDForm $form) => $this->transformSDForm($form));

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="sd-forms-export-' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($rows) {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, [
                'id',
                'sd_number',
                'client_name',
                'pol',
                'pod',
                'final_destination',
                'cargo_description',
                'sales_rep_name',
                'status',
                'shipment_direction',
                'num_containers',
                'container_type',
                'container_size',
                'requested_vessel_date',
                'created_at',
            ]);

            foreach ($rows as $r) {
                fputcsv($fh, [
                    $r['id'] ?? '',
                    $r['sd_number'] ?? '',
                    $r['client_name'] ?? '',
                    $r['pol'] ?? '',
                    $r['pod'] ?? '',
                    $r['final_destination'] ?? '',
                    $r['cargo_description'] ?? '',
                    $r['sales_rep_name'] ?? '',
                    $r['status'] ?? '',
                    $r['shipment_direction'] ?? '',
                    $r['num_containers'] ?? '',
                    $r['container_type'] ?? '',
                    $r['container_size'] ?? '',
                    $r['requested_vessel_date'] ?? '',
                    $r['created_at'] ?? '',
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function stats(Request $request)
    {
        $this->authorize('viewAny', SDForm::class);

        $byStatus = SDForm::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $statusCounts = $byStatus
            ->pluck('count', 'status')
            ->map(fn ($count) => (int) $count);

        $total = $statusCounts->sum();

        return response()->json([
            'data' => [
                'total_forms' => $total,
                'by_status' => $byStatus->map(function ($row) {
                    return [
                        'status' => $row->status,
                        'count' => (int) $row->count,
                    ];
                }),
            ],
        ]);
    }

    public function charts(Request $request)
    {
        $this->authorize('viewAny', SDForm::class);

        $months = max(1, (int) $request->query('months', 6));
        $from = now()->subMonths($months - 1)->startOfMonth();

        $forms = SDForm::query()
            ->where('created_at', '>=', $from)
            ->get();

        $groupedByMonth = $forms->groupBy(
            fn (SDForm $form) => $form->created_at?->format('Y-m-01')
        );

        $monthly = [];
        $cursor = $from->copy();
        while ($cursor <= now()) {
            $key = $cursor->format('Y-m-01');
            $monthly[] = [
                'month' => $key,
                'count' => isset($groupedByMonth[$key]) ? $groupedByMonth[$key]->count() : 0,
            ];

            $cursor->addMonth();
        }

        $byStatus = $forms
            ->groupBy('status')
            ->map(function ($group, $status) {
                return [
                    'status' => $status,
                    'count' => $group->count(),
                ];
            })
            ->values();

        return response()->json([
            'data' => [
                'monthly' => $monthly,
                'by_status' => $byStatus,
            ],
        ]);
    }

    public function emailToOperations(Request $request, SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod']);

        $operationsUsers = User::role('operation')
            ->where('status', 'active')
            ->whereNotNull('email')
            ->get();

        if ($operationsUsers->isEmpty()) {
            return response()->json([
                'message' => 'No operation users with email found to notify.',
            ], 200);
        }

        $to = $operationsUsers->pluck('email')->all();

        Mail::send([], [], function ($message) use ($to, $sdForm) {
            $subject = sprintf('SD %s sent to operations', $sdForm->sd_number ?? ('#' . $sdForm->id));

            $body = view('emails.sd_form_plain', [
                'form' => $sdForm,
            ])->render();

            $message->to($to)
                ->subject($subject)
                ->setBody($body, 'text/html');
        });

        ActivityLogger::log('sd_form.email_to_operations', $sdForm, [
            'recipient_count' => $operationsUsers->count(),
        ]);

        return response()->json([
            'message' => 'SD form emailed to operations.',
        ]);
    }

    public function pdf(Request $request, SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod']);

        $pdf = Pdf::loadView('sd_forms.pdf', [
            'form' => $sdForm,
        ]);

        $filename = ($sdForm->sd_number ?: 'SD-' . $sdForm->id) . '.pdf';

        return $pdf->download($filename);
    }
}

