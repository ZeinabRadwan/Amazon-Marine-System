<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authorization verification switch
    |--------------------------------------------------------------------------
    |
    | Set to false to bypass backend permission verification temporarily.
    | Set to true to reactivate all permission checks.
    |
    */

    'verification_enabled' => (bool) env('PERMISSIONS_VERIFICATION_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Page permission labels
    |--------------------------------------------------------------------------
    |
    | Page keys used in page_permissions with Arabic and English labels.
    | The API uses these labels so frontend can render localized page names.
    |
    */

    'pages' => [
        // Sidebar order
        'dashboard' => ['name_ar' => 'لوحة التحكم', 'name_en' => 'Dashboard'],
        'clients' => ['name_ar' => 'العملاء / CRM', 'name_en' => 'Clients / CRM'],
        'shipments' => ['name_ar' => 'الشحنات', 'name_en' => 'Shipments'],
        'sd_forms' => ['name_ar' => 'نماذج SD', 'name_en' => 'SD Forms'],
        'invoices' => ['name_ar' => 'الفواتير', 'name_en' => 'Invoices'],
        'accounting' => ['name_ar' => 'الحسابات', 'name_en' => 'Accounts'],
        'treasury' => ['name_ar' => 'الخزينة', 'name_en' => 'Treasury'],
        'expenses' => ['name_ar' => 'المصروفات', 'name_en' => 'Expenses'],
        'pricing' => ['name_ar' => 'التسعير', 'name_en' => 'Pricing'],
        'partners' => ['name_ar' => 'الشركاء', 'name_en' => 'Partners'],
        'reports' => ['name_ar' => 'التقارير', 'name_en' => 'Reports'],
        'official_documents' => ['name_ar' => 'المستندات الرسمية', 'name_en' => 'Official Documents'],
        'customer_service' => ['name_ar' => 'خدمة العملاء', 'name_en' => 'Customer Service'],
        'attendance' => ['name_ar' => 'الحضور والانصراف', 'name_en' => 'Attendance'],
        'visits' => ['name_ar' => 'سجل الزيارات', 'name_en' => 'Visit Log'],
        'users' => ['name_ar' => 'المستخدمون', 'name_en' => 'Users'],
        'roles_permissions' => ['name_ar' => 'الأدوار والصلاحيات', 'name_en' => 'Roles & Permissions'],
        'settings' => ['name_ar' => 'الإعدادات', 'name_en' => 'Settings'],

        // Extra pages still used by business rules
        'operations' => ['name_ar' => 'العمليات', 'name_en' => 'Operations'],
        'support_tickets' => ['name_ar' => 'تذاكر الدعم', 'name_en' => 'Support Tickets'],
        'team_performance' => ['name_ar' => 'أداء الفريق', 'name_en' => 'Team Performance'],
        'profile' => ['name_ar' => 'الملف الشخصي', 'name_en' => 'Profile'],
        'cost_viewer' => ['name_ar' => 'عرض التكاليف', 'name_en' => 'Cost Viewer'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Permission groups (for API and seeder)
    |--------------------------------------------------------------------------
    |
    | Keys are domain labels; values are permission names. Used by the
    | permission page API and RolesAndPermissionsSeeder so the frontend
    | can list and assign permissions. Authorization uses $user->can('name').
    |
    */

    'groups' => [
        'users' => [
            'users.view',
            'users.manage',
            'users.manage_admins',
        ],
        'roles' => [
            'roles.view',
            'roles.manage',
            'permissions.view',
            'permissions.manage',
        ],
        'clients' => [
            'clients.view',
            'clients.manage',
            'clients.delete',
        ],
        'sd_forms' => [
            'sd_forms.view',
            'sd_forms.manage',
            'sd_forms.manage_any',
        ],
        'shipments' => [
            'shipments.view',
            'shipments.view_own',
            'shipments.manage_ops',
        ],
        'accounting' => [
            'accounting.view',
            'accounting.manage',
        ],
        'financial' => [
            'financial.view',
            'financial.manage',
        ],
        'reports' => [
            'reports.view',
        ],
        'attendance' => [
            'attendance.view',
            'attendance.admin',
            'attendance.excuses.manage',
        ],
        'pricing' => [
            'pricing.view_offers',
            'pricing.manage_offers',
            'pricing.view_quotes',
            'pricing.manage_quotes',
            'pricing.view_client_pricing',
            'pricing.manage_client_pricing',
        ],
        'tickets' => [
            'tickets.view',
            'tickets.manage',
        ],
        'customer_service' => [
            'customer_service.view_comms',
            'customer_service.manage_comms',
            'customer_service.view_tracking_updates',
            'customer_service.manage_tracking_updates',
        ],
        'notes' => [
            'notes.view',
            'notes.manage',
        ],
    ],

];
