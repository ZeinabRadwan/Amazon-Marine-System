<?php

return [
    'operational_account_name_required' => 'Enter at least one account name (Arabic or English).',
    'operational_account_currencies_required' => 'Select at least one supported currency.',
    'operational_account_type_invalid' => 'Invalid operational treasury account type.',
    'operational_account_name_duplicate' => 'An operational treasury account with this name already exists.',
    'operational_account_has_ledger_entries' => 'Cannot delete: this account has treasury movements or payments. Deactivate it instead.',
    'operational_account_deleted' => 'Operational treasury account deleted.',
    'bank_account_requires_allowed_currencies' => 'Configure at least one allowed currency for this account.',
    'insufficient_balance_currency' => 'Insufficient balance in this currency.',
    'payment_currency_not_supported' => 'This bank does not support the selected currency.',
    'payment_currency_conversion_failed' => 'Automatic currency conversion failed. Ensure exchange rates are configured for both currencies in Settings.',
    'treasury_fx_note' => 'Original: :amount :currency',
];
