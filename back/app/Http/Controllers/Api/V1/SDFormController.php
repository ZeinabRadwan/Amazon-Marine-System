<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSDFormRequest;
use App\Http\Requests\SubmitSDFormRequest;
use App\Http\Requests\UpdateSDFormRequest;
use App\Mail\SdFormMail;
use App\Models\Client;
use App\Models\PdfLayout;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use App\Notifications\OperationSDFormNotification;
use App\Notifications\SdFormBookingConfirmationUploadedNotification;
use App\Notifications\SdFormInformationCompletedNotification;
use App\Notifications\SdFormInformationRequestedNotification;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use App\Services\SDFormService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Mpdf\Mpdf;

class SDFormController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', SDForm::class);

        $query = SDForm::query()
            ->with(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'bookingDecidedBy:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        $authUser = $request->user();
        $isOperationsUser = $authUser && $authUser->roles()->where('name', 'operations')->exists()
            && ! $authUser->roles()->where('name', 'admin')->exists();

        if ($authUser && $authUser->roles()->where('name', 'sales')->exists()) {
            $query->where('sales_rep_id', $authUser->id);
        } elseif ($salesRepId = $request->query('sales_rep_id')) {
            $query->where('sales_rep_id', $salesRepId);
        }

        if ($isOperationsUser) {
            // Once an SD form has been sent to operations it stays in their workflow forever.
            // Visibility is now driven by the permanent flag, not the live status — so booking
            // confirmation, cancellation, or shipment conversion never removes the form from
            // the operations list.
            $query->whereNotNull('sent_to_operations_at');
        }

        if ($shippingLineId = $request->query('shipping_line_id')) {
            $query->where('shipping_line_id', $shippingLineId);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($search = $request->query('search')) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('sd_number', 'like', $term)
                    ->orWhere('cargo_description', 'like', $term)
                    ->orWhere('shipping_line', 'like', $term);
            });
        }

        $sort = $request->query('sort', 'date');
        $direction = strtolower($request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sdFormsTable = (new SDForm)->getTable();

        if ($sort === 'client') {
            $query->orderBy(
                Client::select('name')
                    ->whereColumn('clients.id', $sdFormsTable.'.client_id'),
                $direction
            );
        } else {
            $sortColumn = match ($sort) {
                'sd' => 'sd_number',
                'shipping_line' => 'shipping_line',
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
            'data' => $form->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine']),
        ], 201);
    }

    public function show(SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        return response()->json([
            'data' => $sdForm->load([
                'client',
                'salesRep',
                'pol',
                'pod',
                'linkedShipment',
                'shippingLine',
                'bookingDecidedBy:id,name',
            ]),
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
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine']),
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
            'message' => __('SD form deleted.'),
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
            'client_company_name' => $form->client?->company_name ?? '',
            'pol_id' => $form->pol_id,
            'pod_id' => $form->pod_id,
            'pol' => $form->pol?->name ?? $form->pol_text,
            'pod' => $form->pod?->name ?? $form->pod_text,
            'linked_shipment_id' => $form->linked_shipment_id,
            'acid_number' => $form->acid_number,
            'shipping_line' => $form->shippingLine?->name ?? $form->shipping_line,
            'shipping_line_id' => $form->shipping_line_id,
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
            'notes' => $form->notes,
            'booking_confirmed_at' => $form->booking_confirmed_at?->toIso8601String(),
            'booking_cancelled_at' => $form->booking_cancelled_at?->toIso8601String(),
            'booking_cancellation_reason' => $form->booking_cancellation_reason,
            'booking_decided_by_user_id' => $form->booking_decided_by_user_id,
            'booking_decided_by' => $form->relationLoaded('bookingDecidedBy') && $form->bookingDecidedBy
                ? ['id' => $form->bookingDecidedBy->id, 'name' => $form->bookingDecidedBy->name]
                : null,
            'sent_to_operations_at' => $form->sent_to_operations_at?->toIso8601String(),
            'information_request_note' => $form->information_request_note,
            'information_requested_at' => $form->information_requested_at?->toIso8601String(),
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
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine']),
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

        if (! in_array($sdForm->status, ['draft', 'submitted'])) {
            abort(422, __('Only SD forms in Draft or Submitted status can be sent to operations.'));
        }

        if (! $sdForm->shipment_direction) {
            abort(422, __('Please select shipment direction before sending to operations.'));
        }

        if ($sdForm->shipment_direction === 'Import' && ! $sdForm->acid_number) {
            abort(422, __('ACID number is required for Import shipments.'));
        }

        SDFormService::transitionStatus($sdForm, 'sent_to_operations');

        // Permanent "is handled by operations" flag — survives later status changes.
        if (! $sdForm->sent_to_operations_at) {
            $sdForm->sent_to_operations_at = now();
            $sdForm->save();
        }

        ActivityLogger::log('sd_form.sent_to_operations', $sdForm, [
            'status' => $sdForm->status,
            'sent_to_operations_at' => optional($sdForm->sent_to_operations_at)->toIso8601String(),
        ]);

        $operationsUsers = User::role('operations')
            ->where('status', 'active')
            ->get();

        $this->notificationService->sendDatabaseNotification(
            'sd_form.sent_to_operations',
            $sdForm,
            $operationsUsers,
            new OperationSDFormNotification($sdForm)
        );

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine']),
        ]);
    }

    /**
     * Operations confirms a booking against an SD form: uploads a confirmation file
     * and transitions the form to the booking_confirmed status.
     */
    public function confirmBooking(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('decideBooking', $sdForm), 403);

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv,txt,zip,rar,ppt,pptx', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('sd-form-booking-confirmations/'.$sdForm->id, 'local');

        $confirmation = $sdForm->bookingConfirmations()->create([
            'uploaded_by_user_id' => $user->id,
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        $sdForm->booking_cancellation_reason = null;
        $sdForm->booking_cancelled_at = null;
        $sdForm->booking_confirmed_at = now();
        $sdForm->booking_decided_by_user_id = $user->id;
        $sdForm->save();

        SDFormService::transitionStatus($sdForm, 'booking_confirmed');

        ActivityLogger::log('sd_form.booking_confirmed', $sdForm, [
            'sd_form_booking_confirmation_id' => $confirmation->id,
            'file_name' => $confirmation->name,
        ]);

        $recipients = $this->recipientsForBookingDecisionNotification($user);
        if ($recipients->isNotEmpty()) {
            $this->notificationService->sendDatabaseNotification(
                'sd_form.booking_confirmation_uploaded',
                $sdForm,
                $recipients,
                new SdFormBookingConfirmationUploadedNotification($sdForm, $confirmation)
            );
        }

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'bookingDecidedBy:id,name']),
        ]);
    }

    /**
     * Operations cancels a booking against an SD form: records the cancellation reason
     * and transitions the form to booking_cancelled.
     */
    public function cancelBooking(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('decideBooking', $sdForm), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $sdForm->booking_cancellation_reason = $validated['reason'];
        $sdForm->booking_cancelled_at = now();
        $sdForm->booking_confirmed_at = null;
        $sdForm->booking_decided_by_user_id = $user->id;
        $sdForm->save();

        SDFormService::transitionStatus($sdForm, 'booking_cancelled');

        ActivityLogger::log('sd_form.booking_cancelled', $sdForm, [
            'reason' => $validated['reason'],
        ]);

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'bookingDecidedBy:id,name']),
        ]);
    }

    /**
     * Operations marks a handed-off SD form as "booking in progress" – an intermediate
     * acknowledgement that sits between sent_to_operations and the final confirm/cancel
     * decision. No payload required.
     */
    public function startBooking(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('decideBooking', $sdForm), 403);

        SDFormService::transitionStatus($sdForm, 'booking_in_progress');

        ActivityLogger::log('sd_form.booking_in_progress', $sdForm, [
            'previous_status' => $sdForm->getOriginal('status'),
        ]);

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'bookingDecidedBy:id,name']),
        ]);
    }

    /**
     * Operations asks the sales/admin side to complete missing information on an SD form.
     * Requires a free-text comment that will be surfaced inside the SD form details view.
     */
    public function requestInformation(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('decideBooking', $sdForm), 403);

        $validated = $request->validate([
            'note' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $sdForm->information_request_note = $validated['note'];
        $sdForm->information_requested_at = now();
        $sdForm->save();

        SDFormService::transitionStatus($sdForm, 'information_requested');

        ActivityLogger::log('sd_form.information_requested', $sdForm, [
            'note' => $validated['note'],
        ]);

        $salesRecipients = $this->recipientsForSdFormSalesNotification($sdForm, $user);
        if ($salesRecipients->isNotEmpty()) {
            $this->notificationService->sendDatabaseNotification(
                'sd_form.information_requested',
                $sdForm,
                $salesRecipients,
                new SdFormInformationRequestedNotification($sdForm, $validated['note'])
            );
        }

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'bookingDecidedBy:id,name']),
        ]);
    }

    /**
     * Sales marks data completion on an SD form and returns it to operations (booking required).
     */
    public function completeInformation(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('completeInformation', $sdForm), 403);

        if ($sdForm->status !== 'information_requested') {
            abort(422, __('Only SD forms awaiting data completion can be marked as completed.'));
        }

        SDFormService::transitionStatus($sdForm, 'sent_to_operations');

        ActivityLogger::log('sd_form.information_completed', $sdForm, [
            'completed_by_user_id' => $user->id,
        ]);

        $operationsUsers = User::role('operations')
            ->where('status', 'active')
            ->get();

        if ($operationsUsers->isNotEmpty()) {
            $this->notificationService->sendDatabaseNotification(
                'sd_form.information_completed',
                $sdForm,
                $operationsUsers,
                new SdFormInformationCompletedNotification($sdForm, $user)
            );
        }

        return response()->json([
            'data' => $sdForm->fresh(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'bookingDecidedBy:id,name']),
        ]);
    }

    /**
     * Admin / form owner converts a fully processed SD form into an active shipment
     * and locks the SD form into its final lifecycle state.
     */
    public function convertToShipment(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('convertToShipment', $sdForm), 403);

        $allowedFrom = ['booking_confirmed', 'in_progress', 'completed'];
        if (! in_array($sdForm->status, $allowedFrom, true)) {
            abort(422, __('Only SD forms with a confirmed booking can be converted to a shipment.'));
        }

        SDFormService::transitionStatus($sdForm, 'converted_to_shipment');

        ActivityLogger::log('sd_form.converted_to_shipment', $sdForm, [
            'previous_status' => $sdForm->getOriginal('status'),
            'linked_shipment_id' => $sdForm->linked_shipment_id,
        ]);

        return response()->json([
            'data' => $sdForm->fresh([
                'client',
                'salesRep',
                'pol',
                'pod',
                'shippingLine',
                'linkedShipment',
                'bookingDecidedBy:id,name',
            ]),
        ]);
    }

    /**
     * Admin re-opens an already converted SD form for further edits (returns to booking_confirmed).
     */
    public function reopenConverted(Request $request, SDForm $sdForm)
    {
        $user = $request->user();
        abort_unless($user && $user->can('reopenFromConverted', $sdForm), 403);

        if ($sdForm->status !== 'converted_to_shipment') {
            abort(422, __('Only SD forms that were converted to a shipment can be reopened.'));
        }

        // Re-open back to the latest meaningful operations state.
        $target = $sdForm->booking_confirmed_at ? 'booking_confirmed' : 'in_progress';
        SDFormService::transitionStatus($sdForm, $target);

        ActivityLogger::log('sd_form.reopened_from_converted', $sdForm, [
            'reopened_to' => $target,
        ]);

        return response()->json([
            'data' => $sdForm->fresh([
                'client',
                'salesRep',
                'pol',
                'pod',
                'shippingLine',
                'linkedShipment',
                'bookingDecidedBy:id,name',
            ]),
        ]);
    }

    /**
     * @return Collection<int, User>
     */
    private function recipientsForBookingDecisionNotification(User $actor): Collection
    {
        $adminIds = User::role('admin')->pluck('id');
        $salesIds = User::role(['sales', 'sales_manager'])->pluck('id');
        $ids = $adminIds->merge($salesIds)->unique()->values()->filter(fn ($id) => (int) $id !== (int) $actor->id);

        if ($ids->isEmpty()) {
            return collect();
        }

        return User::query()->whereIn('id', $ids->all())->get();
    }

    /**
     * Notify the owning sales rep (or sales managers when unassigned).
     *
     * @return Collection<int, User>
     */
    private function recipientsForSdFormSalesNotification(SDForm $form, User $actor): Collection
    {
        if ($form->sales_rep_id) {
            $rep = User::query()
                ->where('id', $form->sales_rep_id)
                ->where('status', 'active')
                ->first();

            if ($rep) {
                return collect([(int) $rep->id === (int) $actor->id ? null : $rep])->filter();
            }
        }

        return User::role(['sales_manager', 'admin'])
            ->where('status', 'active')
            ->where('id', '!=', $actor->id)
            ->get();
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
            'Content-Disposition' => 'attachment; filename="sd-forms-export-'.date('Y-m-d').'.csv"',
        ];

        $callback = function () use ($forms) {
            $fh = fopen('php://output', 'w');
            fputcsv($fh, [
                'id',
                'sd_number',
                'client_name',
                'pol',
                'pod',
                'shipping_line',
                'final_destination',
                'cargo_description',
                'sales_rep_name',
                'status',
                'shipment_direction',
                'num_containers',
                'container_type',
                'container_size',
                'requested_vessel_date',
                'notes',
                'created_at',
            ]);

            foreach ($forms as $form) {
                fputcsv($fh, [
                    $form->id,
                    $form->sd_number,
                    $form->client?->name ?? '',
                    $form->pol?->name ?? $form->pol_text,
                    $form->pod?->name ?? $form->pod_text,
                    $form->shippingLine?->name ?? $form->shipping_line,
                    $form->final_destination,
                    $form->cargo_description,
                    $form->salesRep?->name ?? '',
                    $form->status,
                    $form->shipment_direction,
                    $form->num_containers,
                    $form->container_type,
                    $form->container_size,
                    $form->requested_vessel_date ? $form->requested_vessel_date->format('d/m/Y') : '',
                    $form->notes,
                    $form->created_at ? $form->created_at->format('d/m/Y') : '',
                ]);
            }

            fclose($fh);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function stats(Request $request)
    {
        $this->authorize('viewAny', SDForm::class);

        $byStatus = $this->sdFormsQueryForUser($request)
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

        $forms = $this->sdFormsQueryForUser($request)
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

    /**
     * Sales users see only SD forms they own (sales_rep_id); other roles see all forms.
     */
    private function sdFormsQueryForUser(Request $request)
    {
        $query = SDForm::query();
        $authUser = $request->user();
        if ($authUser && $authUser->roles()->where('name', 'sales')->exists()) {
            $query->where('sales_rep_id', $authUser->id);
        }

        return $query;
    }

    public function emailToOperations(Request $request, SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'linkedShipment']);

        try {
            [$filename, $pdfBinary] = $this->buildSdFormPdfBinary($request, $sdForm);
        } catch (\Throwable $e) {
            Log::error('Failed to generate SD form PDF before emailing operations', [
                'sd_form_id' => $sdForm->id,
                'sd_number' => $sdForm->sd_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => __('Failed to generate SD form PDF: :error', ['error' => $e->getMessage()]),
            ], 500);
        }

        if (empty($pdfBinary)) {
            Log::error('Generated SD form PDF is empty', [
                'sd_form_id' => $sdForm->id,
                'sd_number' => $sdForm->sd_number,
            ]);

            return response()->json([
                'message' => __('Generated PDF is empty and cannot be emailed.'),
            ], 500);
        }

        $operationsUsers = User::role('operations')
            ->where('status', 'active')
            ->whereNotNull('email')
            ->get();
        $recipientEmails = $operationsUsers
            ->pluck('email')
            ->filter(fn ($email) => is_string($email) && trim($email) !== '')
            ->values()
            ->all();

        if ($operationsUsers->isEmpty()) {
            return response()->json([
                'message' => __('No operation users with email found to notify.'),
                'summary' => [
                    'recipient_emails' => [],
                    'successful_recipients' => [],
                    'failed_recipients' => [],
                    'successful_sends' => 0,
                    'failed_sends' => 0,
                    'total_recipients' => 0,
                ],
            ], 200);
        }

        $sentCount = 0;
        $successfulRecipients = [];
        $failedRecipients = [];
        $sendErrors = [];
        foreach ($operationsUsers as $user) {
            try {
                Mail::to($user->email)->send(new SdFormMail($sdForm, $pdfBinary, $filename));
                $sentCount++;
                $successfulRecipients[] = (string) $user->email;
            } catch (\Throwable $e) {
                $failedRecipients[] = [
                    'email' => (string) $user->email,
                    'error' => $e->getMessage(),
                ];
                $sendErrors[] = sprintf('%s: %s', (string) $user->email, $e->getMessage());
                Log::error('Failed sending SD form email to operations recipient', [
                    'sd_form_id' => $sdForm->id,
                    'sd_number' => $sdForm->sd_number,
                    'recipient_email' => $user->email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        if ($sentCount === 0) {
            Log::error('Failed to email SD form to all operations recipients', [
                'sd_form_id' => $sdForm->id,
                'sd_number' => $sdForm->sd_number,
                'errors' => $sendErrors,
            ]);

            return response()->json([
                'message' => __('Failed to send email to operations. Please check SMTP/mail settings. :error', [
                    'error' => $sendErrors[0] ?? __('Unknown mail error.'),
                ]),
            ], 500);
        }

        ActivityLogger::log('sd_form.email_to_operations', $sdForm, [
            'recipient_count' => $operationsUsers->count(),
            'sent_count' => $sentCount,
            'errors' => $sendErrors,
            'recipient_emails' => $recipientEmails,
            'successful_recipients' => $successfulRecipients,
            'failed_recipients' => $failedRecipients,
        ]);

        return response()->json([
            'message' => __('SD form emailed to operations.'),
            'sent_count' => $sentCount,
            'failed_count' => max(0, $operationsUsers->count() - $sentCount),
            'summary' => [
                'recipient_emails' => $recipientEmails,
                'successful_recipients' => $successfulRecipients,
                'failed_recipients' => $failedRecipients,
                'successful_sends' => $sentCount,
                'failed_sends' => max(0, $operationsUsers->count() - $sentCount),
                'total_recipients' => $operationsUsers->count(),
            ],
        ]);
    }

    public function pdf(Request $request, SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'linkedShipment']);
        [$filename, $pdfBinary] = $this->buildSdFormPdfBinary($request, $sdForm);

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function buildSdFormPdfBinary(Request $request, SDForm $sdForm): array
    {
        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'linkedShipment']);

        $layout = PdfLayout::where('document_type', 'sd_form')->first();

        $filename = ($sdForm->sd_number ?: 'SD-'.$sdForm->id).'.pdf';

        // SD form PDFs are always generated in English (layout + labels), regardless of UI locale.
        $locale = 'en';
        $labels = $this->sdFormPdfLabels($locale);

        $html = view('sd_forms.pdf', [
            'form' => $sdForm,
            'headerHtml' => $layout?->header_html,
            'footerHtml' => $layout?->footer_html,
            'lang' => $locale,
            'labels' => $labels,
        ])->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'default_font' => 'dejavusans',
            'format' => 'A4',
            'margin_top' => 10,
            'margin_bottom' => 15,
            'margin_left' => 10,
            'margin_right' => 10,
        ]);

        $mpdf->WriteHTML($html);

        $pdfBinary = $mpdf->Output($filename, 'S');
        if (! is_string($pdfBinary) || $pdfBinary === '') {
            throw new \RuntimeException('PDF output is empty');
        }

        return [$filename, $pdfBinary];
    }

    /**
     * @return array<string, string>
     */
    private function sdFormPdfLabels(string $locale): array
    {
        if ($locale === 'ar') {
            return [
                'doc_title' => 'إقرار شحن',
                'brand' => 'Amazon Marine System',
                'brand_tag' => 'International Freight Forwarding',
                'brand_contact' => 'Tel: +201200744888  |  info@amazonmarine.com',
                'sd_no' => 'رقم SD:',
                'sd_date' => 'تاريخ SD:',
                'vessel_date' => 'تاريخ السفينة:',
                'lbl_document_date' => 'التاريخ:',
                'client' => 'العميل:',
                'sec_shipment_info' => 'معلومات الشحنة',
                'pol' => 'ميناء التحميل',
                'pod' => 'ميناء التفريغ',
                'final_destination' => 'الوجهة النهائية',
                'consignee' => 'المرسل إليه',
                'notify_party' => 'الإخطار',
                'contact_details' => 'بيانات الاتصال',
                'email' => 'البريد',
                'phone' => 'الهاتف',
                'same_as_consignee' => 'نفس المرسل إليه',
                'sec_shipping_info' => 'معلومات الشحن',
                'swb_type' => 'نوع SWB',
                'swb_telex' => 'SWB TELEX',
                'freight_on_board' => 'شرط الشحن',
                'status' => 'الحالة',
                'clean_on_board' => 'نظيف على ظهر السفينة',
                'vessel_container' => 'السفينة / الحاوية',
                'container_type' => 'نوع الحاوية',
                'hs_code' => 'رمز HS',
                'weight_kgs' => 'الوزن (كجم)',
                'weight_prefix' => 'إجمالي الوزن الإجمالي: ',
                'shipping_line' => 'خط الملاحة',
                'sec_goods' => 'تفاصيل البضائع',
                'marks_numbers' => 'العلامات / الأرقام',
                'goods_description' => 'وصف البضائع',
                'total_gross' => 'إجمالي الوزن الإجمالي',
                'total_net' => 'إجمالي الوزن الصافي',
                'acid' => 'رقم ACID',
                'notes' => 'ملاحظات',
                'sec_1_client_sales' => 'العميل ومندوب المبيعات',
                'sec_2_shipment_basic' => 'المعلومات الأساسية للشحنة',
                'sec_3_parties' => 'معلومات الأطراف',
                'sec_4_container' => 'تفاصيل الحاوية',
                'sec_5_cargo' => 'معلومات البضاعة',
                'sec_6_weight' => 'تفاصيل الوزن',
                'sec_additional_details' => 'تفاصيل إضافية',
                'sec_import_customs' => 'الجمارك (استيراد)',
                'sec_reefer_details' => 'تفاصيل الحاوية المبردة',
                'sec_additional_notes' => 'ملاحظات إضافية',
                'unit_celsius' => '°C',
                'unit_cbm_h' => 'CBM/H',
                'unit_percent' => '%',
                'lbl_acid_number' => 'رقم ACID',
                'lbl_temp_long' => 'درجة الحرارة (Temp)',
                'lbl_vent_long' => 'التهوية (Vent)',
                'lbl_humidity_long' => 'الرطوبة (Hum)',
                'badge_import' => 'استيراد',
                'badge_reefer' => 'مبرد',
                'lbl_client_name' => 'اسم العميل',
                'lbl_sales_rep' => 'مندوب المبيعات',
                'lbl_sd_number' => 'رقم SD',
                'lbl_pol_full' => 'ميناء التحميل (POL)',
                'lbl_pod_full' => 'ميناء التفريغ (POD)',
                'lbl_shipment_direction' => 'اتجاه الشحنة',
                'lbl_requested_vessel_date' => 'تاريخ السفينة المطلوب',
                'lbl_shipper_info' => 'معلومات الشاحن',
                'lbl_consignee_info' => 'معلومات المرسل إليه',
                'lbl_container_size' => 'حجم الحاوية',
                'lbl_num_containers' => 'عدد الحاويات',
                'lbl_cargo_description' => 'وصف البضاعة',
                'lbl_notes_instructions' => 'ملاحظات / تعليمات خاصة',
                'lbl_total_gross_kg' => 'إجمالي الوزن الإجمالي (كجم)',
                'lbl_total_net_kg' => 'إجمالي الوزن الصافي (كجم)',
                'lbl_shipping_ref' => 'مرجع الشحنة',
                'lbl_reefer' => 'الحاوية المبردة',
                'lbl_temp' => 'الحرارة',
                'lbl_vent' => 'التهوية',
                'lbl_humidity' => 'الرطوبة',
            ];
        }

        return [
            'doc_title' => 'Shipping Declaration',
            'brand' => 'Amazon Marine System',
            'brand_tag' => 'International Freight Forwarding',
            'brand_contact' => 'Tel: +201200744888  |  info@amazonmarine.com',
            'sd_no' => 'SD no:',
            'sd_date' => 'SD date:',
            'vessel_date' => 'Vessel date:',
            'lbl_document_date' => 'Date:',
            'client' => 'Client:',
            'sec_shipment_info' => 'Shipment information',
            'pol' => 'Port of loading',
            'pod' => 'Port of discharge',
            'final_destination' => 'Final destination',
            'consignee' => 'Consignee',
            'notify_party' => 'Notify party',
            'contact_details' => 'Contact details',
            'email' => 'Email',
            'phone' => 'Phone',
            'same_as_consignee' => 'Same as consignee',
            'sec_shipping_info' => 'Shipping information',
            'swb_type' => 'SWB type',
            'swb_telex' => 'SWB TELEX',
            'freight_on_board' => 'Freight Term',
            'status' => 'Status',
            'clean_on_board' => 'Clean on board',
            'vessel_container' => 'Vessel / container',
            'container_type' => 'Container type',
            'hs_code' => 'HS code',
            'weight_kgs' => 'Weight (KGS)',
            'weight_prefix' => 'T.G.W: ',
            'shipping_line' => 'Shipping line',
            'sec_goods' => 'Goods details',
            'marks_numbers' => 'Marks / numbers',
            'goods_description' => 'Description of goods',
            'total_gross' => 'Total gross weight',
            'total_net' => 'Total net weight',
            'acid' => 'ACID number',
            'notes' => 'Notes',
            'sec_1_client_sales' => 'Client & Sales Representative',
            'sec_2_shipment_basic' => 'Shipment Basic Information',
            'sec_3_parties' => 'Party Information',
            'sec_4_container' => 'Container Details',
            'sec_5_cargo' => 'Cargo Information',
            'sec_6_weight' => 'Weight Details',
            'sec_additional_details' => 'Additional Details',
            'sec_import_customs' => 'Import Customs',
            'sec_reefer_details' => 'Reefer Details',
            'sec_additional_notes' => 'Additional Notes',
            'unit_celsius' => '°C',
            'unit_cbm_h' => 'CBM/H',
            'unit_percent' => '%',
            'lbl_acid_number' => 'ACID Number',
            'lbl_temp_long' => 'Temperature (Temp)',
            'lbl_vent_long' => 'Ventilation (Vent)',
            'lbl_humidity_long' => 'Humidity (Hum)',
            'badge_import' => 'IMPORT',
            'badge_reefer' => 'REEFER',
            'lbl_client_name' => 'Client Name',
            'lbl_sales_rep' => 'Sales Representative',
            'lbl_sd_number' => 'SD Number',
            'lbl_pol_full' => 'Port of Loading (POL)',
            'lbl_pod_full' => 'Port of Discharge (POD)',
            'lbl_shipment_direction' => 'Shipment Direction',
            'lbl_requested_vessel_date' => 'Requested Vessel Date',
            'lbl_shipper_info' => 'Shipper Information',
            'lbl_consignee_info' => 'Consignee Information',
            'lbl_container_size' => 'Container Size',
            'lbl_num_containers' => 'Number of Containers',
            'lbl_cargo_description' => 'Cargo Description',
            'lbl_notes_instructions' => 'Notes / special instructions',
            'lbl_total_gross_kg' => 'Total gross weight (KG)',
            'lbl_total_net_kg' => 'Total net weight (KG)',
            'lbl_shipping_ref' => 'Shipment reference',
            'lbl_reefer' => 'Reefer',
            'lbl_temp' => 'Temp',
            'lbl_vent' => 'Vent',
            'lbl_humidity' => 'Humidity',
        ];
    }
}
