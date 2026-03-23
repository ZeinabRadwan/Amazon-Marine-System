<?php

use App\Http\Controllers\Api\AbilitiesController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserPermissionsController;
use App\Http\Controllers\Api\V1\AccountingController;
use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\AdminAttendanceController;
use App\Http\Controllers\Api\V1\AdminExcuseController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\ClientAttachmentController;
use App\Http\Controllers\Api\V1\ClientContactController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\ClientFollowUpController;
use App\Http\Controllers\Api\V1\ClientNoteController;
use App\Http\Controllers\Api\V1\ClientStatusController;
use App\Http\Controllers\Api\V1\CommunicationLogController;
use App\Http\Controllers\Api\V1\CommunicationLogTypeController;
use App\Http\Controllers\Api\V1\CompanyTypeController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DecisionMakerTitleController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\ExcuseController;
use App\Http\Controllers\Api\V1\ExpensesController;
use App\Http\Controllers\Api\V1\InterestLevelController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\LeadSourceController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PdfLayoutController;
use App\Http\Controllers\Api\V1\PortController;
use App\Http\Controllers\Api\V1\PreferredCommMethodController;
use App\Http\Controllers\Api\V1\PricingOfferController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SDFormController;
use App\Http\Controllers\Api\V1\SessionController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\ShipmentController;
use App\Http\Controllers\Api\V1\ShipmentNoteController;
use App\Http\Controllers\Api\V1\ShipmentStatusController;
use App\Http\Controllers\Api\V1\ShipmentTrackingUpdateController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TicketPriorityController;
use App\Http\Controllers\Api\V1\TicketStatusController;
use App\Http\Controllers\Api\V1\TicketTypeController;
use App\Http\Controllers\Api\V1\TreasuryController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\VendorBillController;
use App\Http\Controllers\Api\V1\VendorController;
use App\Http\Controllers\Api\V1\VisitController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public auth routes
    Route::post('auth/login', [AuthController::class, 'login']);

    // Routes below require authentication
    Route::middleware(['auth:sanctum', 'track_session'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Profile APIs
        Route::get('profile', [AuthController::class, 'profile']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::post('profile/avatar', [AuthController::class, 'uploadProfileAvatar']);
        Route::put('profile/password', [AuthController::class, 'updatePassword']);

        // Settings APIs (company/system/notifications/sessions)
        Route::get('settings', [SettingsController::class, 'show']);
        Route::put('settings/company/profile', [SettingsController::class, 'updateCompanyProfile']);
        Route::put('settings/company/location', [SettingsController::class, 'updateCompanyLocation']);
        Route::get('settings/office-location', [SettingsController::class, 'officeLocationShow']);
        Route::put('settings/office-location', [SettingsController::class, 'officeLocationUpdate']);
        Route::put('settings/attendance/policy', [SettingsController::class, 'updateAttendancePolicy']);
        Route::put('settings/system/preferences', [SettingsController::class, 'updateSystemPreferences']);
        Route::put('settings/notifications/preferences', [SettingsController::class, 'updateNotificationPreferences']);
        Route::put('settings/sessions', [SettingsController::class, 'updateSessionSettings']);

        // Sessions (daily combined)
        Route::get('sessions/today', [SessionController::class, 'today']);
        Route::get('sessions/history', [SessionController::class, 'history']);
        Route::post('sessions/logout-others', [SessionController::class, 'logoutOthers']);

        // Activity history
        Route::get('activities', [ActivityController::class, 'index']);

        // Shipment statuses
        Route::get('shipment-statuses', [ShipmentStatusController::class, 'index']);
        Route::post('shipment-statuses', [ShipmentStatusController::class, 'store']);
        Route::put('shipment-statuses/{shipmentStatus}', [ShipmentStatusController::class, 'update']);
        Route::delete('shipment-statuses/{shipmentStatus}', [ShipmentStatusController::class, 'destroy']);

        // Roles & Spatie abilities (for permission page)
        Route::get('roles', [RoleController::class, 'index']);
        Route::post('roles', [RoleController::class, 'store']);
        Route::put('roles/{role}', [RoleController::class, 'update']);
        Route::delete('roles/{role}', [RoleController::class, 'destroy']);
        Route::get('abilities', [AbilitiesController::class, 'index']);

        Route::get('permissions', [PermissionController::class, 'index']);
        Route::post('permissions', [PermissionController::class, 'store']);
        Route::get('permissions/by-role/{roleId}', [PermissionController::class, 'showByRole']);
        Route::delete('permissions/{permission}', [PermissionController::class, 'destroy']);

        // User management
        Route::get('users', [UserController::class, 'index']);
        Route::get('users-with-permissions', [UserPermissionsController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::get('users/{user}', [UserController::class, 'show']);
        Route::put('users/{user}', [UserController::class, 'update']);
        Route::delete('users/{user}', [UserController::class, 'destroy']);
        Route::put('users/{user}/password', [UserController::class, 'updatePassword']);
        Route::post('users/{user}/assign-role', [UserController::class, 'assignRole']);
        Route::get('users/{user}/permissions', [UserPermissionsController::class, 'show']);
        Route::put('users/{user}/permissions', [UserPermissionsController::class, 'update']);
        Route::post('users/{user}/permissions/reset', [UserPermissionsController::class, 'reset']);
        Route::post('users/{user}/activate', [UserController::class, 'activate']);
        Route::post('users/{user}/deactivate', [UserController::class, 'deactivate']);

        // Client lookups (company type, comm method, interest level, decision maker title, lead source, ports)
        Route::get('company-types', [CompanyTypeController::class, 'index']);
        Route::post('company-types', [CompanyTypeController::class, 'store']);
        Route::get('company-types/{companyType}', [CompanyTypeController::class, 'show']);
        Route::put('company-types/{companyType}', [CompanyTypeController::class, 'update']);
        Route::delete('company-types/{companyType}', [CompanyTypeController::class, 'destroy']);

        Route::get('preferred-comm-methods', [PreferredCommMethodController::class, 'index']);
        Route::post('preferred-comm-methods', [PreferredCommMethodController::class, 'store']);
        Route::get('preferred-comm-methods/{preferredCommMethod}', [PreferredCommMethodController::class, 'show']);
        Route::put('preferred-comm-methods/{preferredCommMethod}', [PreferredCommMethodController::class, 'update']);
        Route::delete('preferred-comm-methods/{preferredCommMethod}', [PreferredCommMethodController::class, 'destroy']);

        Route::get('interest-levels', [InterestLevelController::class, 'index']);
        Route::post('interest-levels', [InterestLevelController::class, 'store']);
        Route::get('interest-levels/{interestLevel}', [InterestLevelController::class, 'show']);
        Route::put('interest-levels/{interestLevel}', [InterestLevelController::class, 'update']);
        Route::delete('interest-levels/{interestLevel}', [InterestLevelController::class, 'destroy']);

        Route::get('decision-maker-titles', [DecisionMakerTitleController::class, 'index']);
        Route::post('decision-maker-titles', [DecisionMakerTitleController::class, 'store']);
        Route::get('decision-maker-titles/{decisionMakerTitle}', [DecisionMakerTitleController::class, 'show']);
        Route::put('decision-maker-titles/{decisionMakerTitle}', [DecisionMakerTitleController::class, 'update']);
        Route::delete('decision-maker-titles/{decisionMakerTitle}', [DecisionMakerTitleController::class, 'destroy']);

        Route::get('lead-sources', [LeadSourceController::class, 'index']);
        Route::post('lead-sources', [LeadSourceController::class, 'store']);
        Route::get('lead-sources/{leadSource}', [LeadSourceController::class, 'show']);
        Route::put('lead-sources/{leadSource}', [LeadSourceController::class, 'update']);
        Route::delete('lead-sources/{leadSource}', [LeadSourceController::class, 'destroy']);

        Route::get('client-statuses', [ClientStatusController::class, 'index']);
        Route::post('client-statuses', [ClientStatusController::class, 'store']);
        Route::get('client-statuses/{clientStatus}', [ClientStatusController::class, 'show']);
        Route::put('client-statuses/{clientStatus}', [ClientStatusController::class, 'update']);
        Route::delete('client-statuses/{clientStatus}', [ClientStatusController::class, 'destroy']);

        Route::get('ports', [PortController::class, 'index']);
        Route::post('ports', [PortController::class, 'store']);
        Route::get('ports/{port}', [PortController::class, 'show']);
        Route::put('ports/{port}', [PortController::class, 'update']);
        Route::delete('ports/{port}', [PortController::class, 'destroy']);

        // CRM: clients & contacts
        Route::get('clients', [ClientController::class, 'index'])
            ->middleware('page_permission:clients,view');
        Route::post('clients', [ClientController::class, 'store'])
            ->middleware('page_permission:clients,edit');
        Route::get('clients/stats', [ClientController::class, 'stats'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/charts', [ClientController::class, 'charts'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/financial-summary', [ClientController::class, 'financialSummary'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/pricing', [ClientController::class, 'pricingList'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/export', [ClientController::class, 'export'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/{client}', [ClientController::class, 'show'])
            ->middleware('page_permission:clients,view');
        Route::put('clients/{client}', [ClientController::class, 'update'])
            ->middleware('page_permission:clients,edit');
        Route::delete('clients/{client}', [ClientController::class, 'destroy'])
            ->middleware('page_permission:clients,delete');

        Route::get('clients/{client}/visits', [ClientController::class, 'visits'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/{client}/shipments', [ClientController::class, 'shipments'])
            ->middleware('page_permission:clients,view');
        Route::post('clients/{client}/shipments', [ClientController::class, 'storeShipment'])
            ->middleware('page_permission:clients,edit');

        Route::get('clients/{client}/notes', [ClientNoteController::class, 'index'])
            ->middleware('page_permission:clients,view');
        Route::post('clients/{client}/notes', [ClientNoteController::class, 'store'])
            ->middleware('page_permission:clients,edit');

        Route::get('clients/{client}/follow-ups', [ClientFollowUpController::class, 'index'])
            ->middleware('page_permission:clients,view');
        Route::post('clients/{client}/follow-ups', [ClientFollowUpController::class, 'store'])
            ->middleware('page_permission:clients,edit');

        Route::get('clients/{client}/attachments', [ClientAttachmentController::class, 'index'])
            ->middleware('page_permission:clients,view');
        Route::get('clients/{client}/attachments/{client_attachment}/download', [ClientAttachmentController::class, 'download'])
            ->middleware('page_permission:clients,view');
        Route::post('clients/{client}/attachments', [ClientAttachmentController::class, 'store'])
            ->middleware('page_permission:clients,edit');
        Route::delete('clients/{client}/attachments/{client_attachment}', [ClientAttachmentController::class, 'destroy'])
            ->middleware('page_permission:clients,edit');

        Route::get('clients/{client}/contacts', [ClientContactController::class, 'index'])
            ->middleware('page_permission:clients,view');
        Route::post('clients/{client}/contacts', [ClientContactController::class, 'store'])
            ->middleware('page_permission:clients,edit');
        Route::put('clients/{client}/contacts/{contact}', [ClientContactController::class, 'update'])
            ->middleware('page_permission:clients,edit');
        Route::delete('clients/{client}/contacts/{contact}', [ClientContactController::class, 'destroy'])
            ->middleware('page_permission:clients,delete');

        // SD Forms (Shipping Details)
        Route::get('sd-forms', [SDFormController::class, 'index']);
        Route::post('sd-forms', [SDFormController::class, 'store']);
        Route::get('sd-forms/stats', [SDFormController::class, 'stats']);
        Route::get('sd-forms/charts', [SDFormController::class, 'charts']);
        Route::get('sd-forms/{sdForm}', [SDFormController::class, 'show']);
        Route::put('sd-forms/{sdForm}', [SDFormController::class, 'update']);
        Route::delete('sd-forms/{sdForm}', [SDFormController::class, 'destroy']);
        Route::post('sd-forms/{sdForm}/submit', [SDFormController::class, 'submit']);
        Route::post('sd-forms/{sdForm}/send-to-operations', [SDFormController::class, 'sendToOperations']);
        Route::post('sd-forms/{sdForm}/link-shipment', [SDFormController::class, 'linkShipment']);
        Route::post('sd-forms/{sdForm}/email-operations', [SDFormController::class, 'emailToOperations']);
        Route::get('sd-forms/{sdForm}/pdf', [SDFormController::class, 'pdf']);
        Route::get('sd-forms/export', [SDFormController::class, 'export']);

        // Shipments
        Route::get('shipments/stats', [ShipmentController::class, 'stats']);
        Route::get('shipments/charts', [ShipmentController::class, 'charts']);
        Route::get('shipments/export', [ShipmentController::class, 'export']);
        Route::get('shipments', [ShipmentController::class, 'index']);
        Route::post('shipments', [ShipmentController::class, 'store']);
        Route::get('shipments/{shipment}', [ShipmentController::class, 'show']);
        Route::put('shipments/{shipment}', [ShipmentController::class, 'update']);
        Route::delete('shipments/{shipment}', [ShipmentController::class, 'destroy']);
        Route::get('shipments/{shipment}/tracking-updates', [ShipmentTrackingUpdateController::class, 'index']);
        Route::post('shipments/{shipment}/tracking-updates', [ShipmentTrackingUpdateController::class, 'store']);
        Route::get('shipments/{shipment}/notes', [ShipmentNoteController::class, 'index']);
        Route::post('shipments/{shipment}/notes', [ShipmentNoteController::class, 'store']);

        // Ticket types (lookup – CRUD)
        Route::get('ticket-types', [TicketTypeController::class, 'index']);
        Route::post('ticket-types', [TicketTypeController::class, 'store']);
        Route::get('ticket-types/{ticket_type}', [TicketTypeController::class, 'show']);
        Route::put('ticket-types/{ticket_type}', [TicketTypeController::class, 'update']);
        Route::delete('ticket-types/{ticket_type}', [TicketTypeController::class, 'destroy']);

        // Ticket priorities (lookup – CRUD)
        Route::get('ticket-priorities', [TicketPriorityController::class, 'index']);
        Route::post('ticket-priorities', [TicketPriorityController::class, 'store']);
        Route::get('ticket-priorities/{ticketPriority}', [TicketPriorityController::class, 'show']);
        Route::put('ticket-priorities/{ticketPriority}', [TicketPriorityController::class, 'update']);
        Route::delete('ticket-priorities/{ticketPriority}', [TicketPriorityController::class, 'destroy']);

        // Ticket statuses (lookup – CRUD)
        Route::get('ticket-statuses', [TicketStatusController::class, 'index']);
        Route::post('ticket-statuses', [TicketStatusController::class, 'store']);
        Route::get('ticket-statuses/{ticketStatus}', [TicketStatusController::class, 'show']);
        Route::put('ticket-statuses/{ticketStatus}', [TicketStatusController::class, 'update']);
        Route::delete('ticket-statuses/{ticketStatus}', [TicketStatusController::class, 'destroy']);

        // Tickets (customer service)
        Route::get('tickets/stats', [TicketController::class, 'stats']);
        Route::get('tickets/export', [TicketController::class, 'export']);
        Route::get('tickets', [TicketController::class, 'index']);
        Route::post('tickets', [TicketController::class, 'store']);
        Route::post('tickets/{ticket}/replies', [TicketController::class, 'storeReply']);
        Route::get('tickets/{ticket}', [TicketController::class, 'show']);
        Route::put('tickets/{ticket}', [TicketController::class, 'update']);
        Route::delete('tickets/{ticket}', [TicketController::class, 'destroy']);

        // Communication log (customer service)
        Route::get('communication-logs', [CommunicationLogController::class, 'index']);
        Route::post('communication-logs', [CommunicationLogController::class, 'store']);
        Route::get('communication-logs/{communicationLog}', [CommunicationLogController::class, 'show']);

        // Communication log types (lookup – CRUD)
        Route::get('communication-log-types', [CommunicationLogTypeController::class, 'index']);
        Route::post('communication-log-types', [CommunicationLogTypeController::class, 'store']);
        Route::get('communication-log-types/{communicationLogType}', [CommunicationLogTypeController::class, 'show']);
        Route::put('communication-log-types/{communicationLogType}', [CommunicationLogTypeController::class, 'update']);
        Route::delete('communication-log-types/{communicationLogType}', [CommunicationLogTypeController::class, 'destroy']);

        // Vendors (partners)
        Route::get('vendors/stats', [VendorController::class, 'stats']);
        Route::get('vendors/charts', [VendorController::class, 'charts']);
        Route::get('vendors/export', [VendorController::class, 'export']);
        Route::get('vendors', [VendorController::class, 'index']);
        Route::post('vendors', [VendorController::class, 'store']);
        Route::get('vendors/{vendor}', [VendorController::class, 'show']);
        Route::put('vendors/{vendor}', [VendorController::class, 'update']);
        Route::delete('vendors/{vendor}', [VendorController::class, 'destroy']);
        Route::get('vendors/{vendor}/visits', [VisitController::class, 'indexForVendor']);

        // Visits (follow-ups / communication log)
        Route::get('visits/stats', [VisitController::class, 'stats']);
        Route::get('visits/charts', [VisitController::class, 'charts']);
        Route::get('visits/follow-ups-pending', [VisitController::class, 'followUpsPending']);
        Route::get('visits', [VisitController::class, 'index']);
        Route::post('visits', [VisitController::class, 'store']);
        Route::get('visits/{visit}', [VisitController::class, 'show']);
        Route::put('visits/{visit}', [VisitController::class, 'update']);
        Route::delete('visits/{visit}', [VisitController::class, 'destroy']);

        // Dashboard & reports
        Route::get('dashboard/overview', [DashboardController::class, 'overview']);
        Route::get('reports/shipments', [ReportController::class, 'shipments']);
        Route::get('reports/finance', [ReportController::class, 'finance']);
        Route::get('reports/sales-performance', [ReportController::class, 'salesPerformance']);
        Route::get('reports/team-performance', [ReportController::class, 'teamPerformance']);
        Route::get('reports/team-performance/export', [ReportController::class, 'teamPerformanceExport']);

        // Attendance
        Route::post('attendance/clock-in', [AttendanceController::class, 'clockIn']);
        Route::post('attendance/clock-out', [AttendanceController::class, 'clockOut']);
        Route::post('attendance/check-in', [AttendanceController::class, 'clockIn']);
        Route::post('attendance/check-out', [AttendanceController::class, 'clockOut']);
        Route::get('attendance', [AttendanceController::class, 'index']);
        Route::get('attendance/stats', [AttendanceController::class, 'stats']);
        Route::get('attendance/today', [AttendanceController::class, 'today']);
        Route::get('attendance/excuses', [ExcuseController::class, 'index']);
        Route::post('attendance/excuses', [ExcuseController::class, 'store']);

        Route::middleware('can:attendance.admin')->group(function () {
            Route::get('admin/attendance', [AdminAttendanceController::class, 'index']);
            Route::get('admin/attendance/summary', [AdminAttendanceController::class, 'summary']);
            Route::get('admin/excuses', [AdminExcuseController::class, 'index']);
            Route::patch('admin/excuses/{excuse}', [AdminExcuseController::class, 'update']);
        });

        // Accounting
        Route::get('accounting/summary', [AccountingController::class, 'summary']);
        Route::get('accounting/clients', [AccountingController::class, 'clientAccounts']);
        Route::get('accounting/partners', [AccountingController::class, 'partnerAccounts']);
        Route::get('accounting/clients/export', [AccountingController::class, 'exportClients']);
        Route::get('accounting/partners/export', [AccountingController::class, 'exportPartners']);

        // Invoices
        Route::get('invoices', [InvoiceController::class, 'index']);
        Route::get('invoices/summary', [InvoiceController::class, 'summary']);
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::post('invoices', [InvoiceController::class, 'store']);
        Route::put('invoices/{invoice}', [InvoiceController::class, 'update']);
        Route::post('invoices/{invoice}/issue', [InvoiceController::class, 'issue']);
        Route::post('invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
        Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'recordPayment']);
        Route::get('invoices/export', [InvoiceController::class, 'export']);

        // Vendor bills (partner invoices / payables)
        Route::get('vendor-bills', [VendorBillController::class, 'index']);
        Route::get('vendor-bills/{vendorBill}', [VendorBillController::class, 'show']);
        Route::post('vendor-bills', [VendorBillController::class, 'store']);
        Route::put('vendor-bills/{vendorBill}', [VendorBillController::class, 'update']);
        Route::post('vendor-bills/{vendorBill}/approve', [VendorBillController::class, 'approve']);
        Route::post('vendor-bills/{vendorBill}/cancel', [VendorBillController::class, 'cancel']);
        Route::post('vendor-bills/{vendorBill}/payments', [VendorBillController::class, 'recordPayment']);
        Route::get('vendor-bills/export', [VendorBillController::class, 'export']);

        // Pricing offers (sea & inland rate sheets)
        Route::get('pricing/offers', [PricingOfferController::class, 'index']);
        Route::get('pricing/offers/{offer}', [PricingOfferController::class, 'show']);
        Route::post('pricing/offers', [PricingOfferController::class, 'store']);
        Route::put('pricing/offers/{offer}', [PricingOfferController::class, 'update']);
        Route::post('pricing/offers/{offer}/activate', [PricingOfferController::class, 'activate']);
        Route::post('pricing/offers/{offer}/archive', [PricingOfferController::class, 'archive']);

        // Treasury
        Route::get('treasury/summary', [TreasuryController::class, 'summary']);
        Route::get('treasury/entries', [TreasuryController::class, 'entries']);
        Route::post('treasury/entries', [TreasuryController::class, 'storeEntry']);
        Route::put('treasury/entries/{treasury_entry}', [TreasuryController::class, 'updateEntry']);
        Route::delete('treasury/entries/{treasury_entry}', [TreasuryController::class, 'destroyEntry']);
        Route::post('treasury/transfers', [TreasuryController::class, 'storeTransfer']);
        Route::get('treasury/expenses', [TreasuryController::class, 'expenses']);
        Route::post('treasury/expenses', [TreasuryController::class, 'storeExpense']);

        // Expenses (shipment & general)
        Route::get('expenses/summary', [ExpensesController::class, 'summary']);
        Route::get('expenses/shipment', [ExpensesController::class, 'shipmentIndex']);
        Route::get('expenses/general', [ExpensesController::class, 'generalIndex']);
        Route::get('expenses/export', [ExpensesController::class, 'export']);
        Route::get('expenses/{expense}', [ExpensesController::class, 'show']);
        Route::put('expenses/{expense}', [ExpensesController::class, 'update']);
        Route::delete('expenses/{expense}', [ExpensesController::class, 'destroy']);
        Route::post('expenses', [ExpensesController::class, 'store']);
        Route::post('expenses/{expense}/receipt', [ExpensesController::class, 'uploadReceipt']);

        // Notifications
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // PDF layouts
        Route::get('pdf-layouts/{documentType}', [PdfLayoutController::class, 'show']);
        Route::put('pdf-layouts/{documentType}', [PdfLayoutController::class, 'upsert']);

        // Documents (company / templates)
        Route::get('documents', [DocumentController::class, 'index']);
        Route::post('documents', [DocumentController::class, 'store']);
        Route::get('documents/{document}/download', [DocumentController::class, 'download']);
        Route::delete('documents/{document}', [DocumentController::class, 'destroy']);
    });
});
