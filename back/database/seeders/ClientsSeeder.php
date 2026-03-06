<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $clients = [
            [
                'name' => 'منصور وشركاه للتجارة',
                'contact_name' => 'منصور محمد',
                'company_name' => 'منصور وشركاه للتجارة',
                'company_type' => 'Trader',
                'business_activity' => 'تجارة قطع غيار سيارات',
                'target_markets' => 'السعودية والخليج',
                'tax_id' => '123-456-789',
                'email' => 'mansour@example.com',
                'phone' => '+201234567890',
                'preferred_comm_method' => 'WhatsApp',
                'city' => 'القاهرة',
                'country' => 'EG',
                'address' => 'مدينة نصر - المنطقة الصناعية',
                'website_url' => 'https://mansour-trading.example.com',
                'facebook_url' => 'https://facebook.com/mansour-trading',
                'linkedin_url' => 'https://linkedin.com/company/mansour-trading',
                'status' => 'نشط',
                'lead_source' => 'إحالة عميل',
                'interest_level' => 'High',
                'default_payment_terms' => '30 days',
                'default_currency' => 'USD',
                'notes' => 'عميل مهم في قطاع السيارات',
                'shipments_count' => 12,
                'total_profit' => 18400,
                'last_contact_at' => $now->copy()->subDays(2),
            ],
            [
                'name' => 'الأفق للشحن الدولي',
                'contact_name' => 'أحمد خيري',
                'company_name' => 'الأفق للشحن الدولي',
                'company_type' => 'Exporter',
                'business_activity' => 'شحن بحري وبري',
                'target_markets' => 'الإمارات والسعودية',
                'tax_id' => '987-654-321',
                'email' => 'afaq@example.com',
                'phone' => '+201112223334',
                'preferred_comm_method' => 'Call',
                'city' => 'الإسكندرية',
                'country' => 'EG',
                'address' => 'ميناء الدخيلة',
                'website_url' => 'https://afaq-shipping.example.com',
                'facebook_url' => null,
                'linkedin_url' => null,
                'status' => 'محتمل',
                'lead_source' => 'فيسبوك',
                'interest_level' => 'Medium',
                'default_payment_terms' => '45 days',
                'default_currency' => 'USD',
                'notes' => 'مهتم بخدمات الشحن المبرد',
                'shipments_count' => 5,
                'total_profit' => 7200,
                'last_contact_at' => $now->copy()->subDays(5),
            ],
            [
                'name' => 'النخبة للاستيراد والتصدير',
                'contact_name' => 'منى عبد الله',
                'company_name' => 'النخبة للاستيراد والتصدير',
                'company_type' => 'Importer',
                'business_activity' => 'استيراد أجهزة كهربائية',
                'target_markets' => 'شمال أفريقيا',
                'tax_id' => '555-666-777',
                'email' => 'nokhba@example.com',
                'phone' => '+201009998887',
                'preferred_comm_method' => 'Email',
                'city' => 'طنطا',
                'country' => 'EG',
                'address' => 'شارع الجيش',
                'website_url' => null,
                'facebook_url' => null,
                'linkedin_url' => null,
                'status' => 'جديد',
                'lead_source' => 'LinkedIn',
                'interest_level' => 'High',
                'default_payment_terms' => '60 days',
                'default_currency' => 'EUR',
                'notes' => 'عميل جديد يحتاج متابعة مكثفة',
                'shipments_count' => 0,
                'total_profit' => 0,
                'last_contact_at' => $now->copy()->subDays(1),
            ],
        ];

        foreach ($clients as $data) {
            Client::updateOrCreate(
                [
                    'email' => $data['email'],
                ],
                $data,
            );
        }
    }
}

