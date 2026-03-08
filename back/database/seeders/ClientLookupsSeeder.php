<?php

namespace Database\Seeders;

use App\Models\CompanyType;
use App\Models\PreferredCommMethod;
use App\Models\InterestLevel;
use App\Models\DecisionMakerTitle;
use App\Models\LeadSource;
use Illuminate\Database\Seeder;

class ClientLookupsSeeder extends Seeder
{
    public function run(): void
    {
        $companyTypes = [
            ['name' => 'Factory', 'sort_order' => 1],
            ['name' => 'Trader', 'sort_order' => 2],
            ['name' => 'Exporter', 'sort_order' => 3],
            ['name' => 'Importer', 'sort_order' => 4],
            ['name' => 'Machinery', 'sort_order' => 5],
            ['name' => 'Other', 'sort_order' => 6],
        ];
        foreach ($companyTypes as $i => $row) {
            CompanyType::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order'] ?? $i + 1]
            );
        }

        $commMethods = [
            ['name' => 'Call', 'sort_order' => 1],
            ['name' => 'WhatsApp', 'sort_order' => 2],
            ['name' => 'Email', 'sort_order' => 3],
        ];
        foreach ($commMethods as $i => $row) {
            PreferredCommMethod::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order'] ?? $i + 1]
            );
        }

        $interestLevels = [
            ['name' => 'High', 'sort_order' => 1],
            ['name' => 'Medium', 'sort_order' => 2],
            ['name' => 'Low', 'sort_order' => 3],
        ];
        foreach ($interestLevels as $i => $row) {
            InterestLevel::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order'] ?? $i + 1]
            );
        }

        $titles = [
            ['name' => 'Owner', 'sort_order' => 1],
            ['name' => 'LogisticsManager', 'sort_order' => 2],
            ['name' => 'Other', 'sort_order' => 3],
        ];
        foreach ($titles as $i => $row) {
            DecisionMakerTitle::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order'] ?? $i + 1]
            );
        }

        $sources = [
            ['name' => 'Website', 'sort_order' => 1],
            ['name' => 'Facebook', 'sort_order' => 2],
            ['name' => 'LinkedIn', 'sort_order' => 3],
            ['name' => 'Referral', 'sort_order' => 4],
            ['name' => 'Exhibition', 'sort_order' => 5],
            ['name' => 'Cold Call', 'sort_order' => 6],
            ['name' => 'Other', 'sort_order' => 7],
        ];
        foreach ($sources as $i => $row) {
            LeadSource::updateOrCreate(
                ['name' => $row['name']],
                ['sort_order' => $row['sort_order'] ?? $i + 1]
            );
        }
    }
}
