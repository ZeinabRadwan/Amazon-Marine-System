<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\ClientStatus;
use App\Models\CompanyType;
use App\Models\InterestLevel;
use App\Models\LeadSource;
use App\Models\PreferredCommMethod;
use Illuminate\Database\Seeder;

class ClientsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $clients = [
            [
                'name' => 'منصور وشركاه للتجارة',
                'company_name' => 'منصور وشركاه للتجارة',
                'company_type' => 'Trader',
                'business_activity' => 'تجارة قطع غيار سيارات',
                'target_markets' => 'السعودية والخليج',
                'tax_id' => '123-456-789',
                'email' => 'mansour@example.com',
                'phone' => '+201234567890',
                'preferred_comm_method' => 'WhatsApp',
                'address' => 'مدينة نصر - المنطقة الصناعية',
                'website_url' => 'https://mansour-trading.example.com',
                'facebook_url' => 'https://facebook.com/mansour-trading',
                'linkedin_url' => 'https://linkedin.com/company/mansour-trading',
                'lead_source' => 'Referral',
                'interest_level' => 'High',
                'status_name' => 'Active',
                'notes' => 'عميل مهم في قطاع السيارات',
                'shipments_count' => 12,
                'total_profit' => 18400,
                'last_contact_at' => $now->copy()->subDays(2),
            ],
            [
                'name' => 'الأفق للشحن الدولي',
                'company_name' => 'الأفق للشحن الدولي',
                'company_type' => 'Exporter',
                'business_activity' => 'شحن بحري وبري',
                'target_markets' => 'الإمارات والسعودية',
                'tax_id' => '987-654-321',
                'email' => 'afaq@example.com',
                'phone' => '+201112223334',
                'preferred_comm_method' => 'Call',
                'address' => 'ميناء الدخيلة',
                'website_url' => 'https://afaq-shipping.example.com',
                'facebook_url' => null,
                'linkedin_url' => null,
                'lead_source' => 'Facebook',
                'interest_level' => 'Medium',
                'status_name' => 'Active',
                'notes' => 'مهتم بخدمات الشحن المبرد',
                'shipments_count' => 5,
                'total_profit' => 7200,
                'last_contact_at' => $now->copy()->subDays(5),
            ],
            [
                'name' => 'النخبة للاستيراد والتصدير',
                'company_name' => 'النخبة للاستيراد والتصدير',
                'company_type' => 'Importer',
                'business_activity' => 'استيراد أجهزة كهربائية',
                'target_markets' => 'شمال أفريقيا',
                'tax_id' => '555-666-777',
                'email' => 'nokhba@example.com',
                'phone' => '+201009998887',
                'preferred_comm_method' => 'Email',
                'address' => 'شارع الجيش',
                'website_url' => null,
                'facebook_url' => null,
                'linkedin_url' => null,
                'lead_source' => 'LinkedIn',
                'interest_level' => 'High',
                'status_name' => 'Pending',
                'notes' => 'عميل جديد يحتاج متابعة مكثفة',
                'shipments_count' => 0,
                'total_profit' => 0,
                'last_contact_at' => $now->copy()->subDays(1),
            ],
        ];

        foreach ($clients as $data) {
            $companyType = isset($data['company_type'])
                ? CompanyType::where('name', $data['company_type'])->first()
                : null;
            $commMethod = isset($data['preferred_comm_method'])
                ? PreferredCommMethod::where('name', $data['preferred_comm_method'])->first()
                : null;
            $interestLevel = isset($data['interest_level'])
                ? InterestLevel::where('name', $data['interest_level'])->first()
                : null;
            $leadSource = isset($data['lead_source'])
                ? LeadSource::where('name', $data['lead_source'])->first()
                : null;
            $clientStatus = isset($data['status_name'])
                ? ClientStatus::where('name', $data['status_name'])->first()
                : null;

            unset(
                $data['company_type'],
                $data['preferred_comm_method'],
                $data['interest_level'],
                $data['lead_source'],
                $data['status_name']
            );
            $data['company_type_id'] = $companyType?->id;
            $data['preferred_comm_method_id'] = $commMethod?->id;
            $data['interest_level_id'] = $interestLevel?->id;
            $data['lead_source_id'] = $leadSource?->id;
            $data['status_id'] = $clientStatus?->id;

            Client::updateOrCreate(
                ['email' => $data['email']],
                $data,
            );
        }
    }
}
