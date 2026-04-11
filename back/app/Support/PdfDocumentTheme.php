<?php

namespace App\Support;

use Illuminate\Http\Request;

final class PdfDocumentTheme
{
    public static function localeFromRequest(?Request $request): string
    {
        if ($request === null) {
            return 'en';
        }

        $raw = strtolower((string) $request->header('X-App-Locale', 'en'));

        return str_starts_with($raw, 'ar') ? 'ar' : 'en';
    }

    public static function directionForLocale(string $locale): string
    {
        return $locale === 'ar' ? 'rtl' : 'ltr';
    }

    /**
     * @return array{pdfLocale: string, pdfLang: string, pdfDir: string}
     */
    public static function bladeVars(?Request $request): array
    {
        $locale = self::localeFromRequest($request);

        return [
            'pdfLocale' => $locale,
            'pdfLang' => $locale === 'ar' ? 'ar' : 'en',
            'pdfDir' => self::directionForLocale($locale),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function mpdfConfig(): array
    {
        return [
            'mode' => 'utf-8',
            'default_font' => 'dejavusans',
            'format' => 'A4',
            'margin_top' => 10,
            'margin_bottom' => 15,
            'margin_left' => 10,
            'margin_right' => 10,
        ];
    }

    /**
     * Strip CSS var() from admin-provided HTML fragments. mPDF fails on var() in borders (e.g. _setBorderLine).
     * Uses fallback color inside var(--name, #hex) when present; otherwise #999999.
     */
    public static function sanitizeHtmlForMpdf(?string $html): string
    {
        if ($html === null || $html === '') {
            return '';
        }

        $out = (string) preg_replace_callback(
            '/var\s*\(\s*--[\w-]+(?:\s*,\s*([^)]+))?\)/i',
            static function (array $m): string {
                $fallback = isset($m[1]) ? trim((string) $m[1]) : '';

                return $fallback !== '' ? $fallback : '#999999';
            },
            $html
        );

        return $out;
    }

    /**
     * @return array<string, string>
     */
    public static function sdFormPdfLabels(string $locale): array
    {
        if ($locale === 'ar') {
            return [
                'doc_title' => 'نموذج SD — تفاصيل الشحن',
                'brand_tag' => 'الشحن والخدمات اللوجستية',
                'doc_subtitle' => 'Amazon Marine',
                'sd_no' => 'رقم SD',
                'sd_date' => 'تاريخ SD',
                'vessel_date' => 'تاريخ السفينة',
                'client' => 'العميل',
                'sec_shipment_info' => 'معلومات الشحنة',
                'pol' => 'ميناء التحميل',
                'pod' => 'ميناء التفريغ',
                'final_destination' => 'الوجهة النهائية',
                'consignee' => 'المرسل إليه',
                'notify_party' => 'الإخطار',
                'contact_details' => 'بيانات الاتصال',
                'email' => 'البريد',
                'phone' => 'الهاتف',
                'sec_shipping' => 'معلومات الشحن',
                'swb_type' => 'نوع SWB',
                'freight_board' => 'الشحن على ظهر السفينة',
                'status_clean' => 'الحالة',
                'vessel_container' => 'السفينة / الحاوية',
                'container_type' => 'نوع الحاوية',
                'hs_code' => 'رمز HS',
                'weight_kgs' => 'الوزن (كجم)',
                'shipping_line' => 'خط الملاحة',
                'sec_goods' => 'تفاصيل البضاعة',
                'marks_numbers' => 'العلامات / الأرقام',
                'desc_goods' => 'وصف البضاعة',
                'total_gross' => 'الوزن الإجمالي',
                'total_net' => 'الوزن الصافي',
                'acid' => 'رقم ACID',
                'notes' => 'ملاحظات',
                'same_as_consignee' => 'نفس المرسل إليه',
                'swb_value' => 'SWB TELEX',
                'clean_on_board' => 'نظيف على ظهر السفينة',
                'footer_contact' => 'معلومات الاتصال',
                'footer_phone' => 'الهاتف',
                'footer_email' => 'البريد الإلكتروني',
                'footer_address' => 'العنوان',
                'footer_website' => 'الموقع',
                'tgw' => 'الوزن الإجمالي القائم:',
                'unit_kg' => 'كجم',
            ];
        }

        return [
            'doc_title' => 'SD — Shipping Details Form',
            'brand_tag' => 'Shipping and Logistics Solutions',
            'doc_subtitle' => 'Amazon Marine',
            'sd_no' => 'SD No',
            'sd_date' => 'SD Date',
            'vessel_date' => 'Vessel Date',
            'client' => 'Client',
            'sec_shipment_info' => 'Shipment Info',
            'pol' => 'Port of Loading',
            'pod' => 'Port of Discharge',
            'final_destination' => 'Final Destination',
            'consignee' => 'Consignee',
            'notify_party' => 'Notify Party',
            'contact_details' => 'Contact Details',
            'email' => 'Email',
            'phone' => 'Phone',
            'sec_shipping' => 'Shipping Info',
            'swb_type' => 'SWB Type',
            'freight_board' => 'Freight on Board',
            'status_clean' => 'Status',
            'vessel_container' => 'Vessel / Container',
            'container_type' => 'Container Type',
            'hs_code' => 'HS Code',
            'weight_kgs' => 'Weight (KGS)',
            'shipping_line' => 'Shipping Line',
            'sec_goods' => 'Goods Details',
            'marks_numbers' => 'Marks / Numbers',
            'desc_goods' => 'Description of Goods',
            'total_gross' => 'Total Gross Weight',
            'total_net' => 'Total Net Weight',
            'acid' => 'ACID Number',
            'notes' => 'Notes',
            'same_as_consignee' => 'Same as consignee',
            'swb_value' => 'SWB TELEX',
            'clean_on_board' => 'Clean on Board',
            'footer_contact' => 'Contact Information',
            'footer_phone' => 'Phone',
            'footer_email' => 'Email',
            'footer_address' => 'Address',
            'footer_website' => 'Website',
            'tgw' => 'T.G.W:',
            'unit_kg' => 'KG',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function invoicePdfLabels(string $locale): array
    {
        if ($locale === 'ar') {
            return [
                'tagline' => 'الشحن والخدمات اللوجستية',
                'invoice_title' => 'فاتورة',
                'invoice_no' => 'الرقم',
                'date' => 'التاريخ',
                'due_date' => 'تاريخ الاستحقاق',
                'shipment_bl' => 'بوليصة الشحنة',
                'billed_to' => 'الفاتورة إلى',
                'description' => 'وصف الصنف',
                'qty' => 'الكمية',
                'unit_price' => 'سعر الوحدة',
                'total' => 'الإجمالي',
                'subtotal' => 'المجموع الفرعي',
                'vat' => 'ضريبة القيمة المضافة (14٪)',
                'total_due' => 'الإجمالي',
                'grand_total' => 'الإجمالي الكلي',
                'notes' => 'ملاحظات',
                'footer_generated' => 'تم الإنشاء في',
                'footer_system' => 'نظام Amazon Marine',
                'payment_info' => 'معلومات الدفع',
                'payment_hint' => 'يرجى ذكر رقم الفاتورة في إشعار التحويل البنكي.',
                'terms_title' => 'الشروط والأحكام',
                'terms_body' => 'يستحق السداد وفق الشروط المتفق عليها. تظل السلع ملكاً للبائع حتى السداد الكامل.',
                'signature' => 'التوقيع',
                'contact_title' => 'للتواصل',
            ];
        }

        return [
            'tagline' => 'Shipping & Logistics Services',
            'invoice_title' => 'INVOICE',
            'invoice_no' => 'No',
            'date' => 'Date',
            'due_date' => 'Due Date',
            'shipment_bl' => 'Shipment BL',
            'billed_to' => 'Invoice To',
            'description' => 'Item description',
            'qty' => 'Qty',
            'unit_price' => 'Unit price',
            'total' => 'Total',
            'subtotal' => 'Subtotal',
            'vat' => 'VAT (14%)',
            'total_due' => 'TOTAL',
            'grand_total' => 'Grand total',
            'notes' => 'Notes',
            'footer_generated' => 'Generated on',
            'footer_system' => 'Amazon Marine system',
            'payment_info' => 'Payment information',
            'payment_hint' => 'Please reference the invoice number on your bank transfer.',
            'terms_title' => 'Terms & conditions',
            'terms_body' => 'Payment is due as agreed. Goods remain the property of the seller until paid in full.',
            'signature' => 'Signature',
            'contact_title' => 'Contact',
        ];
    }
}
