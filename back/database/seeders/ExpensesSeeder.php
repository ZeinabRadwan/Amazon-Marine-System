<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

class ExpensesSeeder extends Seeder
{
    public function run(): void
    {
        $categories = $this->seedCategories();
        $user = User::first();
        if (! $user) {
            return;
        }

        $this->seedGeneralExpenses($categories, $user);
        $this->seedShipmentExpenses($categories, $user);
    }

    /**
     * @return array<string, ExpenseCategory>
     */
    private function seedCategories(): array
    {
        $list = [
            ['name' => 'Freight', 'code' => 'FRT'],
            ['name' => 'THC', 'code' => 'THC'],
            ['name' => 'نقل داخلي', 'code' => 'DOM_TR'],
            ['name' => 'تخليص جمركي', 'code' => 'CUST'],
            ['name' => 'إيجار', 'code' => 'RENT'],
            ['name' => 'رواتب', 'code' => 'SAL'],
            ['name' => 'مرافق', 'code' => 'UTIL'],
            ['name' => 'تسويق', 'code' => 'MKT'],
            ['name' => 'أخرى', 'code' => 'OTH'],
        ];

        $out = [];
        foreach ($list as $item) {
            $out[$item['code']] = ExpenseCategory::firstOrCreate(
                ['code' => $item['code']],
                ['name' => $item['name']]
            );
        }

        return $out;
    }

    /**
     * @param array<string, ExpenseCategory> $categories
     */
    private function seedGeneralExpenses(array $categories, User $user): void
    {
        $general = [
            [
                'category' => 'RENT',
                'description' => 'Monthly office rent',
                'amount' => 15000,
                'currency_code' => 'EGP',
                'payment_method' => 'bank_transfer',
                'invoice_number' => 'RENT-2026-03',
            ],
            [
                'category' => 'UTIL',
                'description' => 'Electricity and water',
                'amount' => 2200,
                'currency_code' => 'EGP',
                'payment_method' => 'cash',
            ],
            [
                'category' => 'SAL',
                'description' => 'Staff salary advance',
                'amount' => 8000,
                'currency_code' => 'EGP',
                'payment_method' => 'bank_transfer',
            ],
            [
                'category' => 'MKT',
                'description' => 'Online advertising',
                'amount' => 500,
                'currency_code' => 'USD',
                'payment_method' => 'card',
            ],
            [
                'category' => 'OTH',
                'description' => 'Office supplies',
                'amount' => 350,
                'currency_code' => 'EGP',
                'payment_method' => 'cash',
                'invoice_number' => 'SUP-001',
            ],
        ];

        $baseDate = now()->subDays(rand(5, 25));

        foreach ($general as $i => $row) {
            $cat = $categories[$row['category']] ?? $categories['OTH'];
            Expense::firstOrCreate(
                [
                    'expense_category_id' => $cat->id,
                    'description' => $row['description'],
                    'expense_date' => $baseDate->copy()->addDays($i * 3),
                ],
                [
                    'amount' => $row['amount'],
                    'currency_code' => $row['currency_code'],
                    'payment_method' => $row['payment_method'] ?? null,
                    'invoice_number' => $row['invoice_number'] ?? null,
                    'paid_by_id' => $user->id,
                    'shipment_id' => null,
                    'has_receipt' => (bool) ($i % 2),
                ]
            );
        }
    }

    /**
     * @param array<string, ExpenseCategory> $categories
     */
    private function seedShipmentExpenses(array $categories, User $user): void
    {
        $shipment = Shipment::orderBy('id')->first();
        $vendor = Vendor::orderBy('id')->first();

        if (! $shipment || ! $vendor) {
            return;
        }

        $shipmentRows = [
            [
                'category' => 'FRT',
                'description' => 'Ocean freight',
                'amount' => 1200,
                'currency_code' => 'USD',
                'invoice_number' => 'FRT-001',
            ],
            [
                'category' => 'THC',
                'description' => 'Terminal handling',
                'amount' => 350,
                'currency_code' => 'USD',
            ],
            [
                'category' => 'CUST',
                'description' => 'Customs clearance',
                'amount' => 2500,
                'currency_code' => 'EGP',
                'invoice_number' => 'CUST-001',
            ],
        ];

        $baseDate = now()->subDays(rand(3, 15));

        foreach ($shipmentRows as $i => $row) {
            $cat = $categories[$row['category']] ?? $categories['OTH'];
            Expense::firstOrCreate(
                [
                    'shipment_id' => $shipment->id,
                    'expense_category_id' => $cat->id,
                    'description' => $row['description'],
                    'expense_date' => $baseDate->copy()->addDays($i),
                ],
                [
                    'amount' => $row['amount'],
                    'currency_code' => $row['currency_code'],
                    'invoice_number' => $row['invoice_number'] ?? null,
                    'paid_by_id' => $user->id,
                    'vendor_id' => $vendor->id,
                    'has_receipt' => (bool) ($i % 2),
                ]
            );
        }
    }
}
