<?php

namespace App\Services;

use App\Models\User;
use App\Models\Shipment;
use App\Models\Invoice;
use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Vendor;
use App\Models\VendorBill;
use App\Models\Ticket;
use App\Models\PricingOffer;
use App\Models\PricingQuote;
use App\Models\TreasuryEntry;
use App\Models\Visit;
use App\Models\SDForm;
use App\Models\ClientFollowUp;
use App\Models\ShipmentOperationTask;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;

class ChatbotService
{
    protected $llm;
    protected $steps = [];

    public function __construct(LlmProviderService $llm)
    {
        $this->llm = $llm;
    }

    protected function addStep(string $key, string $status = 'success', ?string $details = null): void
    {
        // Update existing step if key matches the last one, otherwise append
        $lastIdx = count($this->steps) - 1;
        if ($lastIdx >= 0 && $this->steps[$lastIdx]['key'] === $key) {
            $this->steps[$lastIdx]['status'] = $status;
            $this->steps[$lastIdx]['details'] = $details;
            $this->steps[$lastIdx]['timestamp'] = now()->toIso8601String();
        } else {
            $this->steps[] = [
                'key' => $key,
                'status' => $status,
                'details' => $details,
                'timestamp' => now()->toIso8601String()
            ];
        }
    }

    public function listPrompts(string $locale = 'ar'): array
    {
        return $this->getPrompts($locale);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMPT CATALOGUE
    // ─────────────────────────────────────────────────────────────────────────
    public function getPrompts(string $locale = 'ar'): array
    {
        $all = [

            // ── FINANCE ──────────────────────────────────────────────────────
            [
                'id' => 'finance.profit.this_month',
                'label' => ['ar' => 'الأرباح هذا الشهر', 'en' => 'Profit this month'],
                'aliases' => [
                    'ar' => ['كم أرباحي هذا الشهر', 'أرباح الشهر', 'صافي الربح', 'تقرير الارباح', 'مكاسب الشهر', 'ربحية الشهر', 'ما هو الربح'],
                    'en' => ['how much profit this month', 'monthly profit', 'profit report', 'net profit', 'earnings this month'],
                ],
                'description' => ['ar' => 'صافي ربح الشركة للشهر الحالي (إيرادات - مصروفات)', 'en' => 'Company net profit for the current month'],
            ],
            [
                'id' => 'finance.revenue.this_month',
                'label' => ['ar' => 'الإيرادات هذا الشهر', 'en' => 'Revenue this month'],
                'aliases' => [
                    'ar' => ['كم الإيرادات', 'إجمالي الإيراد', 'دخل الشهر', 'مبيعات الشهر', 'حجم الإيراد'],
                    'en' => ['how much revenue this month', 'total revenue', 'monthly sales', 'income this month'],
                ],
                'description' => ['ar' => 'إجمالي الإيرادات من الفواتير الصادرة للشهر الحالي', 'en' => 'Total revenue from issued invoices this month'],
            ],
            [
                'id' => 'finance.expenses.this_month',
                'label' => ['ar' => 'مصروفات هذا الشهر', 'en' => 'Expenses this month'],
                'aliases' => [
                    'ar' => ['كم المصروفات', 'إجمالي التكاليف', 'مصاريف الشهر', 'تكاليف الشهر', 'المصروفات الشهرية'],
                    'en' => ['how much expenses this month', 'total costs', 'monthly expenses', 'costs this month'],
                ],
                'description' => ['ar' => 'إجمالي المصروفات والتكاليف للشهر الحالي', 'en' => 'Total expenses registered this month'],
            ],
            [
                'id' => 'finance.overdue_invoices',
                'label' => ['ar' => 'الفواتير المتأخرة', 'en' => 'Overdue invoices'],
                'aliases' => [
                    'ar' => ['الفواتير غير المدفوعة', 'الفواتير المتأخرة', 'من لم يدفع', 'الفواتير المستحقة', 'متأخرات الفواتير'],
                    'en' => ['overdue invoices', 'unpaid invoices', 'late payments', 'outstanding invoices'],
                ],
                'description' => ['ar' => 'عدد ومبلغ الفواتير المتأخرة أو غير المدفوعة', 'en' => 'Count and total of overdue or unpaid invoices'],
            ],
            [
                'id' => 'finance.payments.this_month',
                'label' => ['ar' => 'المدفوعات المستلمة هذا الشهر', 'en' => 'Payments received this month'],
                'aliases' => [
                    'ar' => ['كم استلمنا', 'المبالغ المحصلة', 'تحصيلات الشهر', 'مدفوعات العملاء'],
                    'en' => ['payments received', 'cash collected', 'collections this month'],
                ],
                'description' => ['ar' => 'إجمالي المدفوعات المستلمة من العملاء هذا الشهر', 'en' => 'Total client payments received this month'],
            ],
            [
                'id' => 'finance.summary',
                'label' => ['ar' => 'الملخص المالي', 'en' => 'Financial summary'],
                'aliases' => [
                    'ar' => ['الوضع المالي', 'تقرير مالي', 'ملخص الحسابات', 'كيف الأمور مالياً', 'نظرة مالية عامة'],
                    'en' => ['financial summary', 'finance overview', 'financial report', 'how is finance'],
                ],
                'description' => ['ar' => 'ملخص شامل للإيرادات والمصروفات والربح الشهري', 'en' => 'Full financial snapshot: revenue, expenses, and profit'],
            ],

            // ── SHIPMENTS ─────────────────────────────────────────────────────
            [
                'id' => 'shipments.stats',
                'label' => ['ar' => 'إحصائيات الشحنات', 'en' => 'Shipment stats'],
                'aliases' => [
                    'ar' => ['حالة الشحنات', 'كم شحنة', 'عدد الشحنات', 'نظرة على الشحنات', 'شحنات الشركة'],
                    'en' => ['shipment status', 'how many shipments', 'shipment count', 'shipment overview'],
                ],
                'description' => ['ar' => 'إجمالي الشحنات وعدد الشحنات النشطة', 'en' => 'Total shipments and active shipment count'],
            ],
            [
                'id' => 'shipments.this_month',
                'label' => ['ar' => 'شحنات هذا الشهر', 'en' => 'Shipments this month'],
                'aliases' => [
                    'ar' => ['شحنات الشهر', 'كم شحنة هذا الشهر', 'شحنات جديدة الشهر'],
                    'en' => ['shipments this month', 'new shipments this month', 'monthly shipments'],
                ],
                'description' => ['ar' => 'عدد الشحنات المضافة هذا الشهر', 'en' => 'Number of shipments added this month'],
            ],
            [
                'id' => 'shipments.active',
                'label' => ['ar' => 'الشحنات النشطة', 'en' => 'Active shipments'],
                'aliases' => [
                    'ar' => ['الشحنات الجارية', 'الشحنات في الطريق', 'شحنات قيد التنفيذ', 'ما هي الشحنات المفتوحة'],
                    'en' => ['active shipments', 'in-transit shipments', 'open shipments', 'ongoing shipments'],
                ],
                'description' => ['ar' => 'الشحنات الجارية حالياً (في الطريق، جمارك، تحميل)', 'en' => 'Shipments currently in progress'],
            ],
            [
                'id' => 'shipments.financials_summary',
                'label' => ['ar' => 'ملخص أرباح الشحنات', 'en' => 'Shipment profit summary'],
                'aliases' => [
                    'ar' => ['ربح الشحنات', 'هامش الشحنات', 'إيرادات الشحنات', 'تكلفة الشحنات'],
                    'en' => ['shipment profit', 'shipment margin', 'shipment revenue', 'shipment cost'],
                ],
                'description' => ['ar' => 'إجمالي التكلفة وسعر البيع والربح من الشحنات', 'en' => 'Total cost, selling price, and profit from shipments'],
            ],
            [
                'id' => 'shipments.pending_tasks',
                'label' => ['ar' => 'المهام المعلقة للشحنات', 'en' => 'Pending shipment tasks'],
                'aliases' => [
                    'ar' => ['مهام غير مكتملة', 'ما المهام المعلقة', 'تسكات الشحنات', 'ما لم يتم من مهام'],
                    'en' => ['pending tasks', 'incomplete tasks', 'shipment tasks', 'todo tasks'],
                ],
                'description' => ['ar' => 'عدد مهام الشحنات غير المكتملة', 'en' => 'Shipment operation tasks not yet completed'],
            ],

            // ── CRM / CLIENTS ─────────────────────────────────────────────────
            [
                'id' => 'clients.stats',
                'label' => ['ar' => 'إحصائيات العملاء', 'en' => 'Client stats'],
                'aliases' => [
                    'ar' => ['عدد العملاء', 'إجمالي العملاء', 'كم عميل', 'إحصائيات CRM'],
                    'en' => ['client count', 'how many clients', 'total clients', 'crm stats'],
                ],
                'description' => ['ar' => 'إجمالي العملاء وعدد العملاء الجدد هذا الشهر', 'en' => 'Total clients and new clients this month'],
            ],
            [
                'id' => 'clients.new_this_month',
                'label' => ['ar' => 'العملاء الجدد هذا الشهر', 'en' => 'New clients this month'],
                'aliases' => [
                    'ar' => ['عملاء جدد', 'من انضم هذا الشهر', 'كم عميل جديد الشهر'],
                    'en' => ['new clients', 'new clients this month', 'clients joined this month'],
                ],
                'description' => ['ar' => 'العملاء المضافون في النظام خلال الشهر الحالي', 'en' => 'Clients added to the system this month'],
            ],
            [
                'id' => 'clients.top_by_profit',
                'label' => ['ar' => 'أفضل العملاء ربحية', 'en' => 'Top clients by profit'],
                'aliases' => [
                    'ar' => ['أكثر العملاء ربحاً', 'أفضل عميل', 'رانكينج العملاء', 'العميل الأعلى ربحاً'],
                    'en' => ['top clients', 'most profitable clients', 'best clients', 'client ranking'],
                ],
                'description' => ['ar' => 'العملاء الخمسة الأعلى ربحاً مرتبين تنازلياً', 'en' => 'Top 5 clients ranked by total profit'],
            ],
            [
                'id' => 'clients.follow_ups_due',
                'label' => ['ar' => 'متابعات العملاء المطلوبة', 'en' => 'Client follow-ups due'],
                'aliases' => [
                    'ar' => ['متابعات اليوم', 'من يجب متابعته', 'مواعيد المتابعة', 'فولو أب العملاء'],
                    'en' => ['follow-ups due', 'pending follow-ups', 'client follow-ups today'],
                ],
                'description' => ['ar' => 'متابعات العملاء المطلوبة اليوم أو المتأخرة', 'en' => 'Client follow-ups that are due today or overdue'],
            ],
            [
                'id' => 'clients.visits_this_month',
                'label' => ['ar' => 'زيارات العملاء هذا الشهر', 'en' => 'Client visits this month'],
                'aliases' => [
                    'ar' => ['كم زيارة', 'زيارات الشهر', 'عدد الزيارات', 'زيارات المبيعات'],
                    'en' => ['client visits', 'sales visits', 'visits this month'],
                ],
                'description' => ['ar' => 'عدد زيارات العملاء المسجلة هذا الشهر', 'en' => 'Number of client visits registered this month'],
            ],

            // ── ATTENDANCE / HR ────────────────────────────────────────────────
            [
                'id' => 'attendance.today',
                'label' => ['ar' => 'حضور اليوم', 'en' => 'Today attendance'],
                'aliases' => [
                    'ar' => ['مين حضر اليوم', 'نسبة الحضور', 'حالة الموظفين', 'حضور وغياب'],
                    'en' => ['who is in today', 'today attendance', 'attendance today', 'who showed up'],
                ],
                'description' => ['ar' => 'عدد الموظفين الذين سجلوا حضورهم اليوم', 'en' => 'Employees who clocked in today'],
            ],
            [
                'id' => 'attendance.this_month',
                'label' => ['ar' => 'سجل الحضور الشهري', 'en' => 'Monthly attendance record'],
                'aliases' => [
                    'ar' => ['حضور الشهر', 'تقرير الحضور', 'سجل الموظفين'],
                    'en' => ['monthly attendance', 'attendance report', 'employee attendance'],
                ],
                'description' => ['ar' => 'ملخص سجلات الحضور لهذا الشهر', 'en' => 'Summary of attendance records this month'],
            ],
            [
                'id' => 'attendance.absences_today',
                'label' => ['ar' => 'غياب اليوم', 'en' => 'Absences today'],
                'aliases' => [
                    'ar' => ['من غاب اليوم', 'الغائبون اليوم', 'غيابات اليوم'],
                    'en' => ['who is absent today', 'absentees today', 'absences today'],
                ],
                'description' => ['ar' => 'الموظفون الغائبون اليوم مقارنة بالإجمالي', 'en' => 'Absent employees today compared to total staff'],
            ],

            // ── VENDORS ────────────────────────────────────────────────────────
            [
                'id' => 'vendors.stats',
                'label' => ['ar' => 'إحصائيات الموردين', 'en' => 'Vendor stats'],
                'aliases' => [
                    'ar' => ['عدد الموردين', 'كم مورد', 'إجمالي الشركاء', 'شركاء الشركة'],
                    'en' => ['vendor count', 'how many vendors', 'total vendors', 'partner count'],
                ],
                'description' => ['ar' => 'إجمالي عدد الموردين والشركاء المسجلين', 'en' => 'Total registered vendors and partners'],
            ],
            [
                'id' => 'vendors.outstanding_bills',
                'label' => ['ar' => 'فواتير الموردين المعلقة', 'en' => 'Outstanding vendor bills'],
                'aliases' => [
                    'ar' => ['فواتير موردين غير مدفوعة', 'ديون الموردين', 'ما نحتاج ندفعه للموردين', 'مستحقات الموردين'],
                    'en' => ['unpaid vendor bills', 'vendor balance due', 'outstanding bills', 'vendor debts'],
                ],
                'description' => ['ar' => 'إجمالي فواتير الموردين غير المسددة', 'en' => 'Total unpaid vendor bills amount'],
            ],

            // ── INVOICES ───────────────────────────────────────────────────────
            [
                'id' => 'invoices.this_month',
                'label' => ['ar' => 'الفواتير هذا الشهر', 'en' => 'Invoices this month'],
                'aliases' => [
                    'ar' => ['كم فاتورة', 'فواتير الشهر', 'عدد الفواتير', 'فواتير العملاء'],
                    'en' => ['invoices this month', 'monthly invoices', 'invoice count'],
                ],
                'description' => ['ar' => 'عدد ومبلغ الفواتير الصادرة هذا الشهر', 'en' => 'Count and value of invoices issued this month'],
            ],
            [
                'id' => 'invoices.stats',
                'label' => ['ar' => 'إحصائيات الفواتير', 'en' => 'Invoice statistics'],
                'aliases' => [
                    'ar' => ['تقرير الفواتير', 'وضع الفواتير', 'فواتير مدفوعة وغير مدفوعة'],
                    'en' => ['invoice stats', 'invoice report', 'invoice overview', 'paid vs unpaid'],
                ],
                'description' => ['ar' => 'نسبة الفواتير المدفوعة والمعلقة والمتأخرة', 'en' => 'Breakdown of paid, pending, and overdue invoices'],
            ],

            // ── TICKETS / SUPPORT ──────────────────────────────────────────────
            [
                'id' => 'tickets.stats',
                'label' => ['ar' => 'تذاكر الدعم', 'en' => 'Support tickets'],
                'aliases' => [
                    'ar' => ['عدد التذاكر', 'تذاكر مفتوحة', 'طلبات الدعم', 'شكاوى العملاء'],
                    'en' => ['support tickets', 'open tickets', 'ticket count', 'customer complaints'],
                ],
                'description' => ['ar' => 'عدد تذاكر الدعم المفتوحة والكلية', 'en' => 'Open and total support ticket count'],
            ],
            [
                'id' => 'tickets.open',
                'label' => ['ar' => 'التذاكر المفتوحة', 'en' => 'Open tickets'],
                'aliases' => [
                    'ar' => ['تذاكر لم تُحل', 'المشاكل المفتوحة', 'ما لم يُحل من تذاكر'],
                    'en' => ['open tickets', 'unresolved tickets', 'pending tickets'],
                ],
                'description' => ['ar' => 'قائمة التذاكر المفتوحة غير المغلقة', 'en' => 'Tickets that have not been closed yet'],
            ],

            // ── PRICING ────────────────────────────────────────────────────────
            [
                'id' => 'pricing.offers.this_month',
                'label' => ['ar' => 'عروض الأسعار هذا الشهر', 'en' => 'Pricing offers this month'],
                'aliases' => [
                    'ar' => ['كم عرض سعر', 'عروض الشهر', 'عروض أسعار جديدة'],
                    'en' => ['pricing offers this month', 'how many offers', 'new pricing offers'],
                ],
                'description' => ['ar' => 'عدد عروض الأسعار الصادرة هذا الشهر', 'en' => 'Number of pricing offers issued this month'],
            ],
            [
                'id' => 'pricing.quotes.this_month',
                'label' => ['ar' => 'عروض الأسعار للعملاء هذا الشهر', 'en' => 'Quotations this month'],
                'aliases' => [
                    'ar' => ['كم اقتباس', 'اقتباسات الشهر', 'قوتيشن العملاء'],
                    'en' => ['quotations this month', 'how many quotes', 'client quotes'],
                ],
                'description' => ['ar' => 'عدد الاقتباسات التسعيرية للعملاء هذا الشهر', 'en' => 'Pricing quotations sent to clients this month'],
            ],

            // ── SD FORMS / SALES OPERATION ─────────────────────────────────────
            [
                'id' => 'sdforms.this_month',
                'label' => ['ar' => 'نماذج SD هذا الشهر', 'en' => 'SD forms this month'],
                'aliases' => [
                    'ar' => ['نماذج SD', 'نماذج البيع والتشغيل', 'كم نموذج SD'],
                    'en' => ['SD forms', 'sales dispatch forms', 'how many SD forms'],
                ],
                'description' => ['ar' => 'عدد نماذج SD المنشأة هذا الشهر', 'en' => 'SD forms created this month'],
            ],

            // ── TREASURY ───────────────────────────────────────────────────────
            [
                'id' => 'treasury.balance',
                'label' => ['ar' => 'رصيد الخزينة', 'en' => 'Treasury balance'],
                'aliases' => [
                    'ar' => ['رصيد الخزنة', 'السيولة النقدية', 'كم في الخزينة', 'رصيد الصندوق'],
                    'en' => ['treasury balance', 'cash balance', 'how much in treasury', 'fund balance'],
                ],
                'description' => ['ar' => 'الرصيد الحالي للخزينة (إجمالي الداخل - إجمالي الخارج)', 'en' => 'Current treasury balance (total in - total out)'],
            ],

            // ── USERS / TEAM ───────────────────────────────────────────────────
            [
                'id' => 'users.stats',
                'label' => ['ar' => 'إحصائيات الموظفين', 'en' => 'Employee stats'],
                'aliases' => [
                    'ar' => ['عدد الموظفين', 'كم موظف', 'فريق الشركة', 'المستخدمون'],
                    'en' => ['employee count', 'how many employees', 'staff count', 'team size'],
                ],
                'description' => ['ar' => 'عدد موظفي الشركة المسجلين في النظام', 'en' => 'Number of company employees in the system'],
            ],
        ];

        return array_map(function ($p) use ($locale) {
            return [
                'id'          => $p['id'],
                'label'       => $p['label'][$locale] ?? $p['label']['en'],
                'aliases'     => $p['aliases'][$locale] ?? $p['aliases']['en'],
                'description' => $p['description'][$locale] ?? $p['description']['en'],
            ];
        }, $all);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ASK PIPELINE
    // ─────────────────────────────────────────────────────────────────────────
    public function ask(string $message, string $locale = 'ar'): array
    {
        $this->steps = [];
        $user = Auth::user();
        $prompts = $this->getPrompts($locale);
        $source = 'local';

        $this->addStep('local_matcher', 'processing');
        $promptId = $this->matchLocally($message, $prompts);

        if (!$promptId) {
            $this->addStep('local_matcher', 'fail');
            $source = 'llm';
            $this->addStep('llm_consultation', 'processing');
            try {
                $promptId = $this->resolveByLLM($message, $prompts, $locale);
                if ($promptId) {
                    $this->addStep('llm_consultation', 'success');
                } else {
                    $this->addStep('llm_consultation', 'refused',
                        $locale === 'ar'
                            ? 'لم يتم العثور على إجراء مطابق في الكتالوج.'
                            : 'No matching action found in the system catalogue.'
                    );
                }
            } catch (Exception $e) {
                $this->addStep('llm_consultation', 'fail', $e->getMessage());
                return [
                    'type'     => 'error',
                    'source'   => 'llm_failed',
                    'steps'    => $this->steps,
                    'response' => $locale === 'ar'
                        ? 'عذراً، فشل الاتصال بنظام الذكاء الاصطناعي. السبب: ' . $e->getMessage()
                        : 'Sorry, the AI system connection failed. Reason: ' . $e->getMessage(),
                ];
            }
        } else {
            $this->addStep('local_matcher', 'success');
        }

        if (!$promptId) {
            $this->addStep('final_routing', 'refused',
                $locale === 'ar'
                    ? 'تعذر توجيه الطلب لأي إجراء متاح.'
                    : 'Could not route request to any available action.'
            );
            return [
                'type'     => 'refused',
                'source'   => $source,
                'steps'    => $this->steps,
                'response' => $locale === 'ar'
                    ? 'معذرة، لم أتمكن من العثور على إجراء نظامي مطابق لطلبك. أنا مدرب فقط للمساعدة في تقارير وأدوات النظام.'
                    : "I'm sorry, I couldn't find a system action for your request. I'm trained only to assist with specific system reports.",
            ];
        }

        $this->addStep('final_routing', 'processing');
        $this->addStep('system_action', 'processing');
        try {
            $result = $this->executeAction($promptId, $user, $locale);
            $this->addStep('final_routing', 'success');
            $this->addStep('system_action', 'success');
            $result['source'] = $source;
            $result['steps']  = $this->steps;
            return $result;
        } catch (Exception $e) {
            $this->addStep('system_action', 'fail', $e->getMessage());
            return [
                'type'     => 'error',
                'source'   => $source,
                'steps'    => $this->steps,
                'response' => ($locale === 'ar' ? 'حدث خطأ أثناء جلب البيانات: ' : 'An error occurred: ') . $e->getMessage(),
            ];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOCAL MATCHER (Tier 1)
    // ─────────────────────────────────────────────────────────────────────────
    protected function matchLocally(string $message, array $prompts): ?string
    {
        $msg = mb_strtolower($message);
        foreach ($prompts as $prompt) {
            if (mb_strpos($msg, mb_strtolower($prompt['label'])) !== false) {
                return $prompt['id'];
            }
            foreach ($prompt['aliases'] as $alias) {
                if (mb_strpos($msg, mb_strtolower($alias)) !== false) {
                    return $prompt['id'];
                }
            }
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LLM RESOLVER (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    protected function resolveByLLM(string $message, array $prompts, string $locale): ?string
    {
        $systemPrompt = $this->buildSystemPrompt($prompts, $locale);
        $response     = $this->llm->generate($systemPrompt, $message);

        if (!$response) return null;

        $cleanJson = preg_replace('/^```json\s*|\s*```$/i', '', trim($response));
        $json      = json_decode($cleanJson, true);
        return $json['prompt_id'] ?? null;
    }

    protected function buildSystemPrompt(array $prompts, string $locale): string
    {
        $catalogue = array_map(fn($p) => [
            'id'          => $p['id'],
            'description' => $p['description'],
            'examples'    => $p['aliases'],
        ], $prompts);

        $langInsn = $locale === 'ar'
            ? 'The user is writing in Arabic. Use Arabic semantic understanding. Typos and variations are common — focus on INTENT not exact wording.'
            : 'The user is writing in English.';

        return "You are a smart system routing assistant for a Shipping & CRM management platform. {$langInsn}
Your ONLY job is to identify which predefined system action (prompt_id) the user is asking about.

Available System Actions:
" . json_encode($catalogue, JSON_UNESCAPED_UNICODE) . "

STRICT Rules:
1. Return ONLY valid JSON: {\"prompt_id\": \"<id>\"} or {\"prompt_id\": null}
2. Match by SEMANTIC MEANING and INTENT — not exact words. Synonyms, typos, and shorthand are acceptable.
3. If the user question is about a topic NOT in the catalogue above, return {\"prompt_id\": null}
4. Do NOT output ANY text other than the JSON object.
5. Examples of correct matching: 'كم ربحنا' → finance.profit.this_month | 'show me shipments' → shipments.stats";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION EXECUTOR (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    protected function executeAction(string $promptId, ?User $user, string $locale): array
    {
        $ar = fn($a, $b) => $locale === 'ar' ? $a : $b;
        $now = now();
        $startOfMonth = $now->copy()->startOfMonth();

        switch ($promptId) {

            // ── FINANCE ──────────────────────────────────────────────────────

            case 'finance.profit.this_month': {
                $revenue = Invoice::where('status', 'issued')->where('issue_date', '>=', $startOfMonth)->sum('net_amount');
                $cost    = DB::table('expenses')->where('expense_date', '>=', $startOfMonth)->sum('amount');
                $profit  = $revenue - $cost;
                return $this->formatMetricResponse(
                    $ar('صافي الربح الشهري', 'Monthly Net Profit'),
                    '$' . number_format($profit, 2),
                    $ar("إيرادات: $" . number_format($revenue, 2) . " — مصروفات: $" . number_format($cost, 2),
                        "Revenue: $" . number_format($revenue, 2) . " — Costs: $" . number_format($cost, 2))
                );
            }

            case 'finance.revenue.this_month': {
                $revenue = Invoice::where('status', 'issued')->where('issue_date', '>=', $startOfMonth)->sum('net_amount');
                $count   = Invoice::where('status', 'issued')->where('issue_date', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('إيرادات الشهر', 'Monthly Revenue'),
                    '$' . number_format($revenue, 2),
                    $ar("من $count فاتورة صادرة هذا الشهر", "From $count invoices issued this month")
                );
            }

            case 'finance.expenses.this_month': {
                $total = DB::table('expenses')->where('expense_date', '>=', $startOfMonth)->sum('amount');
                $count = DB::table('expenses')->where('expense_date', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('مصروفات الشهر', 'Monthly Expenses'),
                    '$' . number_format($total, 2),
                    $ar("$count قيد مصروف مسجل هذا الشهر", "$count expense entries registered this month")
                );
            }

            case 'finance.overdue_invoices': {
                $count  = Invoice::whereIn('status', ['unpaid', 'partial'])->where('due_date', '<', $now)->count();
                $amount = Invoice::whereIn('status', ['unpaid', 'partial'])->where('due_date', '<', $now)->sum('net_amount');
                return $this->formatMetricResponse(
                    $ar('الفواتير المتأخرة', 'Overdue Invoices'),
                    $count . ' ' . $ar('فاتورة', 'invoices'),
                    $ar("إجمالي مبلغ: $" . number_format($amount, 2), 'Total overdue: $' . number_format($amount, 2))
                );
            }

            case 'finance.payments.this_month': {
                $total = Payment::where('payment_date', '>=', $startOfMonth)->sum('amount');
                $count = Payment::where('payment_date', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('مدفوعات مستلمة', 'Payments Received'),
                    '$' . number_format($total, 2),
                    $ar("$count عملية دفع هذا الشهر", "$count payment transactions this month")
                );
            }

            case 'finance.summary': {
                $revenue  = Invoice::where('status', 'issued')->where('issue_date', '>=', $startOfMonth)->sum('net_amount');
                $costs    = DB::table('expenses')->where('expense_date', '>=', $startOfMonth)->sum('amount');
                $profit   = $revenue - $costs;
                $received = Payment::where('payment_date', '>=', $startOfMonth)->sum('amount');
                $overdue  = Invoice::whereIn('status', ['unpaid', 'partial'])->where('due_date', '<', $now)->sum('net_amount');
                return $this->formatTableResponse(
                    $ar('الملخص المالي الشهري', 'Monthly Financial Summary'),
                    [
                        [$ar('الإيرادات', 'Revenue'), '$' . number_format($revenue, 2)],
                        [$ar('المصروفات', 'Expenses'), '$' . number_format($costs, 2)],
                        [$ar('صافي الربح', 'Net Profit'), '$' . number_format($profit, 2)],
                        [$ar('المحصل', 'Collected'), '$' . number_format($received, 2)],
                        [$ar('المتأخر', 'Overdue'), '$' . number_format($overdue, 2)],
                    ]
                );
            }

            // ── SHIPMENTS ─────────────────────────────────────────────────────

            case 'shipments.stats': {
                $total   = Shipment::count();
                $active  = Shipment::whereIn('status', ['in_transit', 'loading', 'customs', 'booked'])->count();
                $done    = Shipment::where('status', 'delivered')->count();
                return $this->formatMetricResponse(
                    $ar('إحصائيات الشحنات', 'Shipment Stats'),
                    $total . ' ' . $ar('شحنة', 'shipments'),
                    $ar("$active نشطة · $done مكتملة", "$active active · $done delivered")
                );
            }

            case 'shipments.this_month': {
                $count = Shipment::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('شحنات هذا الشهر', 'Shipments This Month'),
                    $count . ' ' . $ar('شحنة', 'shipments'),
                    $ar('عدد الشحنات المضافة في ' . $now->format('F Y'), 'Shipments added in ' . $now->format('F Y'))
                );
            }

            case 'shipments.active': {
                $items = Shipment::whereIn('status', ['in_transit', 'loading', 'customs', 'booked'])
                    ->with(['client'])
                    ->limit(10)
                    ->get(['id', 'bl_number', 'status', 'client_id']);
                $rows = $items->map(fn($s) => [
                    $s->bl_number ?? "BL-{$s->id}",
                    ucfirst(str_replace('_', ' ', $s->status)),
                    $s->client?->name ?? '—',
                ])->toArray();
                return $this->formatTableResponse(
                    $ar('الشحنات النشطة (أحدث 10)', 'Active Shipments (latest 10)'),
                    $rows,
                    $ar(['رقم BL', 'الحالة', 'العميل'], ['BL Number', 'Status', 'Client'])
                );
            }

            case 'shipments.financials_summary': {
                $cost    = Shipment::sum('cost_total');
                $revenue = Shipment::sum('selling_price_total');
                $profit  = Shipment::sum('profit_total');
                return $this->formatTableResponse(
                    $ar('ملخص الماليات — كل الشحنات', 'Financials — All Shipments'),
                    [
                        [$ar('إجمالي التكلفة', 'Total Cost'), '$' . number_format($cost, 2)],
                        [$ar('إجمالي الإيراد', 'Total Revenue'), '$' . number_format($revenue, 2)],
                        [$ar('إجمالي الربح', 'Total Profit'), '$' . number_format($profit, 2)],
                    ]
                );
            }

            case 'shipments.pending_tasks': {
                $count = ShipmentOperationTask::where('completed', false)->count();
                return $this->formatMetricResponse(
                    $ar('مهام معلقة', 'Pending Tasks'),
                    $count . ' ' . $ar('مهمة', 'tasks'),
                    $ar('مهام شحنات غير مكتملة حتى الآن', 'Shipment operation tasks not yet completed')
                );
            }

            // ── CRM / CLIENTS ─────────────────────────────────────────────────

            case 'clients.stats': {
                $total = Client::count();
                $new   = Client::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('إجمالي العملاء', 'Total Clients'),
                    $total . ' ' . $ar('عميل', 'clients'),
                    $ar("$new عميل جديد هذا الشهر", "$new new clients this month")
                );
            }

            case 'clients.new_this_month': {
                $new = Client::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('العملاء الجدد', 'New Clients'),
                    $new . ' ' . $ar('عميل', 'clients'),
                    $ar('مضافون في ' . $now->format('F Y'), 'Added in ' . $now->format('F Y'))
                );
            }

            case 'clients.top_by_profit': {
                $clients = Client::orderByDesc('total_profit')->limit(5)->get(['name', 'company_name', 'total_profit']);
                $rows = $clients->map(fn($c) => [
                    $c->company_name ?: $c->name,
                    '$' . number_format($c->total_profit, 2),
                ])->toArray();
                return $this->formatTableResponse(
                    $ar('أفضل 5 عملاء ربحية', 'Top 5 Clients by Profit'),
                    $rows,
                    $ar(['العميل', 'إجمالي الربح'], ['Client', 'Total Profit'])
                );
            }

            case 'clients.follow_ups_due': {
                $count = ClientFollowUp::whereDate('follow_up_date', '<=', $now->toDateString())
                    ->where('done', false)->count();
                return $this->formatMetricResponse(
                    $ar('متابعات مطلوبة', 'Follow-ups Due'),
                    $count . ' ' . $ar('متابعة', 'follow-ups'),
                    $ar('اليوم أو متأخرة عن موعدها', 'Due today or overdue')
                );
            }

            case 'clients.visits_this_month': {
                $count = Visit::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('زيارات العملاء', 'Client Visits'),
                    $count . ' ' . $ar('زيارة', 'visits'),
                    $ar('مسجلة هذا الشهر', 'Registered this month')
                );
            }

            // ── ATTENDANCE ────────────────────────────────────────────────────

            case 'attendance.today': {
                $count = AttendanceRecord::whereDate('date', $now->toDateString())->count();
                $total = User::where('active', true)->count();
                return $this->formatMetricResponse(
                    $ar('الحضور اليوم', "Today's Attendance"),
                    "$count / $total",
                    $ar('موظف سجل حضوره اليوم', 'employees clocked in today')
                );
            }

            case 'attendance.this_month': {
                $records = AttendanceRecord::where('date', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('سجلات الحضور الشهري', 'Monthly Attendance'),
                    $records . ' ' . $ar('سجل', 'records'),
                    $ar('تسجيلات حضور لهذا الشهر', 'attendance records this month')
                );
            }

            case 'attendance.absences_today': {
                $total   = User::where('active', true)->count();
                $present = AttendanceRecord::whereDate('date', $now->toDateString())->count();
                $absent  = max(0, $total - $present);
                return $this->formatMetricResponse(
                    $ar('غيابات اليوم', 'Absences Today'),
                    $absent . ' ' . $ar('موظف', 'employees'),
                    $ar("من أصل $total موظف مسجل ($present حضر)", "Out of $total employees ($present present)")
                );
            }

            // ── VENDORS ───────────────────────────────────────────────────────

            case 'vendors.stats': {
                $total = Vendor::count();
                return $this->formatMetricResponse(
                    $ar('الموردون والشركاء', 'Vendors & Partners'),
                    $total . ' ' . $ar('مورد', 'vendors'),
                    $ar('مسجلون في النظام', 'registered in the system')
                );
            }

            case 'vendors.outstanding_bills': {
                $amount = VendorBill::whereNotIn('status', ['paid', 'cancelled'])->sum('total_amount');
                $count  = VendorBill::whereNotIn('status', ['paid', 'cancelled'])->count();
                return $this->formatMetricResponse(
                    $ar('فواتير موردين معلقة', 'Outstanding Vendor Bills'),
                    '$' . number_format($amount, 2),
                    $ar("$count فاتورة مورد غير مسددة", "$count unpaid vendor bills")
                );
            }

            // ── INVOICES ──────────────────────────────────────────────────────

            case 'invoices.this_month': {
                $count  = Invoice::where('issue_date', '>=', $startOfMonth)->count();
                $amount = Invoice::where('issue_date', '>=', $startOfMonth)->sum('net_amount');
                return $this->formatMetricResponse(
                    $ar('فواتير الشهر', 'Monthly Invoices'),
                    $count . ' ' . $ar('فاتورة', 'invoices'),
                    $ar("إجمالي: $" . number_format($amount, 2), "Total: $" . number_format($amount, 2))
                );
            }

            case 'invoices.stats': {
                $paid    = Invoice::where('status', 'paid')->count();
                $unpaid  = Invoice::whereIn('status', ['unpaid', 'issued'])->count();
                $partial = Invoice::where('status', 'partial')->count();
                $overdue = Invoice::whereIn('status', ['unpaid', 'partial'])->where('due_date', '<', $now)->count();
                return $this->formatTableResponse(
                    $ar('توزيع الفواتير', 'Invoice Breakdown'),
                    [
                        [$ar('مدفوعة', 'Paid'), $paid],
                        [$ar('غير مدفوعة', 'Unpaid'), $unpaid],
                        [$ar('مدفوعة جزئياً', 'Partial'), $partial],
                        [$ar('متأخرة', 'Overdue'), $overdue],
                    ]
                );
            }

            // ── TICKETS ───────────────────────────────────────────────────────

            case 'tickets.stats': {
                $total = Ticket::count();
                $open  = Ticket::where('is_closed', false)->count();
                return $this->formatMetricResponse(
                    $ar('تذاكر الدعم', 'Support Tickets'),
                    $total . ' ' . $ar('تذكرة', 'tickets'),
                    $ar("$open مفتوحة حالياً", "$open currently open")
                );
            }

            case 'tickets.open': {
                $items = Ticket::where('is_closed', false)->with('client')->limit(10)->get(['id', 'subject', 'client_id', 'created_at']);
                $rows  = $items->map(fn($t) => [
                    "#" . $t->id,
                    $t->subject ?? '—',
                    $t->client?->name ?? '—',
                ])->toArray();
                return $this->formatTableResponse(
                    $ar('التذاكر المفتوحة', 'Open Tickets'),
                    $rows,
                    $ar(['#', 'الموضوع', 'العميل'], ['#', 'Subject', 'Client'])
                );
            }

            // ── PRICING ───────────────────────────────────────────────────────

            case 'pricing.offers.this_month': {
                $count = PricingOffer::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('عروض الأسعار', 'Pricing Offers'),
                    $count . ' ' . $ar('عرض', 'offers'),
                    $ar('صادرة هذا الشهر', 'issued this month')
                );
            }

            case 'pricing.quotes.this_month': {
                $count = PricingQuote::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('اقتباسات التسعير', 'Pricing Quotes'),
                    $count . ' ' . $ar('اقتباس', 'quotes'),
                    $ar('للعملاء هذا الشهر', 'sent to clients this month')
                );
            }

            // ── SD FORMS ──────────────────────────────────────────────────────

            case 'sdforms.this_month': {
                $count = SDForm::where('created_at', '>=', $startOfMonth)->count();
                return $this->formatMetricResponse(
                    $ar('نماذج SD', 'SD Forms'),
                    $count . ' ' . $ar('نموذج', 'forms'),
                    $ar('منشأة هذا الشهر', 'created this month')
                );
            }

            // ── TREASURY ──────────────────────────────────────────────────────

            case 'treasury.balance': {
                $inflow  = TreasuryEntry::where('type', 'in')->sum('amount');
                $outflow = TreasuryEntry::where('type', 'out')->sum('amount');
                $balance = $inflow - $outflow;
                return $this->formatTableResponse(
                    $ar('رصيد الخزينة', 'Treasury Balance'),
                    [
                        [$ar('إجمالي الداخل', 'Total Inflow'), '$' . number_format($inflow, 2)],
                        [$ar('إجمالي الخارج', 'Total Outflow'), '$' . number_format($outflow, 2)],
                        [$ar('الرصيد الحالي', 'Current Balance'), '$' . number_format($balance, 2)],
                    ]
                );
            }

            // ── USERS / TEAM ──────────────────────────────────────────────────

            case 'users.stats': {
                $total  = User::count();
                $active = User::where('active', true)->count();
                return $this->formatMetricResponse(
                    $ar('موظفو الشركة', 'Company Employees'),
                    $total . ' ' . $ar('موظف', 'employees'),
                    $ar("$active نشط", "$active active")
                );
            }

            // ── DEFAULT ───────────────────────────────────────────────────────

            default:
                return $this->formatMetricResponse(
                    $ar('تقرير النظام', 'System Report'),
                    $ar('تم توليد التقرير', 'Report Generated'),
                    $ar("الإجراء '$promptId' محدد. يرجى زيارة القسم المعني.", "Action '$promptId' assigned. Visit the corresponding module.")
                );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FORMATTERS
    // ─────────────────────────────────────────────────────────────────────────
    protected function formatMetricResponse(string $title, $value, string $subtitle = ''): array
    {
        return [
            'type'         => 'metric',
            'title'        => $title,
            'value'        => (string) $value,
            'subtitle'     => $subtitle,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    protected function formatTableResponse(string $title, array $rows, array $headers = []): array
    {
        return [
            'type'         => 'table',
            'title'        => $title,
            'headers'      => $headers,
            'rows'         => $rows,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
