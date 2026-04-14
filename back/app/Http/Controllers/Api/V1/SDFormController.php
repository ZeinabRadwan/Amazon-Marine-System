<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSDFormRequest;
use App\Http\Requests\SubmitSDFormRequest;
use App\Http\Requests\UpdateSDFormRequest;
use App\Models\Client;
use App\Models\PdfLayout;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use App\Notifications\OperationSDFormNotification;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use App\Services\SDFormService;
use Illuminate\Http\Request;
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
            ->with(['client', 'salesRep', 'pol', 'pod', 'shippingLine']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->query('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($request->user() && $request->user()->roles()->where('name', 'sales')->exists()) {
            $query->where('sales_rep_id', $request->user()->id);
        } elseif ($salesRepId = $request->query('sales_rep_id')) {
            $query->where('sales_rep_id', $salesRepId);
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
            'data' => $sdForm->load(['client', 'salesRep', 'pol', 'pod', 'linkedShipment', 'shippingLine']),
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

        if ($sdForm->status !== 'submitted') {
            abort(422, $sdForm->status === 'draft'
                ? __('Submit the SD form first before sending it to operations.')
                : __('Only SD forms in Submitted status can be sent to operations.'));
        }

        SDFormService::transitionStatus($sdForm, 'sent_to_operations');

        ActivityLogger::log('sd_form.sent_to_operations', $sdForm, [
            'status' => $sdForm->status,
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

        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod', 'linkedShipment']);

        $operationsUsers = User::role('operations')
            ->where('status', 'active')
            ->whereNotNull('email')
            ->get();

        if ($operationsUsers->isEmpty()) {
            return response()->json([
                'message' => __('No operation users with email found to notify.'),
            ], 200);
        }

        $this->notificationService->sendEmail(
            'sd_form.email_to_operations',
            $sdForm,
            $operationsUsers,
            function (User $user) use ($sdForm): void {
                $subject = sprintf('SD %s sent to operations', $sdForm->sd_number ?? ('#'.$sdForm->id));

                $body = view('emails.sd_form_plain', [
                    'form' => $sdForm,
                ])->render();

                Mail::send([], [], function ($message) use ($user, $subject, $body): void {
                    $message->to($user->email)
                        ->subject($subject)
                        ->setBody($body, 'text/html');
                });
            }
        );

        ActivityLogger::log('sd_form.email_to_operations', $sdForm, [
            'recipient_count' => $operationsUsers->count(),
        ]);

        return response()->json([
            'message' => __('SD form emailed to operations.'),
        ]);
    }

    public function pdf(Request $request, SDForm $sdForm)
    {
        $this->authorize('view', $sdForm);

        $sdForm->loadMissing(['client', 'salesRep', 'pol', 'pod', 'shippingLine', 'linkedShipment']);

        $layout = PdfLayout::where('document_type', 'sd_form')->first();

        $filename = ($sdForm->sd_number ?: 'SD-'.$sdForm->id).'.pdf';

        $locale = strtolower((string) $request->header('X-App-Locale', 'en')) === 'ar' ? 'ar' : 'en';
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

        return response($mpdf->Output($filename, 'S'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
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
                'freight_on_board' => 'شروط الشحن',
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
                'sec_1_client_sales' => '١. العميل ومندوب المبيعات',
                'sec_2_shipment_basic' => '٢. المعلومات الأساسية للشحنة',
                'sec_3_parties' => '٣. معلومات الأطراف',
                'sec_4_container' => '٤. تفاصيل الحاوية',
                'sec_5_cargo' => '٥. معلومات البضاعة',
                'sec_6_weight' => '٦. تفاصيل الوزن',
                'sec_7_notes' => '٧. ملاحظات إضافية',
                'sec_import_customs' => 'الجمارك (استيراد)',
                'sec_reefer_details' => 'تفاصيل الحاوية المبردة',
                'sec_additional_notes' => 'ملاحظات إضافية',
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
            'freight_on_board' => 'Freight terms',
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
            'sec_1_client_sales' => '1. Client & Sales Representative',
            'sec_2_shipment_basic' => '2. Shipment Basic Information',
            'sec_3_parties' => '3. Parties Information',
            'sec_4_container' => '4. Container Details',
            'sec_5_cargo' => '5. Cargo Information',
            'sec_6_weight' => '6. Weight Details',
            'sec_7_notes' => '7. Additional Notes',
            'sec_import_customs' => 'Import Customs',
            'sec_reefer_details' => 'Reefer Details',
            'sec_additional_notes' => 'Additional Notes',
            'lbl_acid_number' => 'ACID Number',
            'lbl_temp_long' => 'Temperature (Temp)',
            'lbl_vent_long' => 'Ventilation (Vent)',
            'lbl_humidity_long' => 'Humidity (Hum)',
            'badge_import' => 'IMPORT',
            'badge_reefer' => 'REEFER',
            'lbl_client_name' => 'Client Name',
            'lbl_sales_rep' => 'Sales Representative',
            'lbl_sd_number' => 'SD number',
            'lbl_pol_full' => 'Port of loading (POL)',
            'lbl_pod_full' => 'Port of discharge (POD)',
            'lbl_shipment_direction' => 'Shipment direction',
            'lbl_requested_vessel_date' => 'Requested vessel date',
            'lbl_shipper_info' => 'Shipper information',
            'lbl_consignee_info' => 'Consignee information',
            'lbl_container_size' => 'Container size',
            'lbl_num_containers' => 'Number of containers',
            'lbl_cargo_description' => 'Cargo description',
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
