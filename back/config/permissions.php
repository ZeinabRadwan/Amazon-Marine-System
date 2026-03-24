<?php

return [

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
