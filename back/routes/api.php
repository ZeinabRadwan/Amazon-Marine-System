<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\ClientContactController;
use App\Http\Controllers\Api\V1\PortController;
use App\Http\Controllers\Api\V1\VendorController;
use App\Http\Controllers\Api\V1\VisitController;
use App\Http\Controllers\Api\V1\SDFormController;
use App\Http\Controllers\Api\V1\ShipmentController;
use App\Http\Controllers\Api\V1\ShipmentOperationsController;
use App\Http\Controllers\Api\V1\ShipmentTaskController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\VendorBillController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\TreasuryEntryController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\NoteController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;

Route::prefix('v1')->group(function () {
    // Public auth routes
    Route::post('auth/login', [AuthController::class, 'login']);

    // Routes below require authentication
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Role & permission management (admin only, guarded by permissions)
        Route::get('roles', [RoleController::class, 'index']);
        Route::post('roles', [RoleController::class, 'store']);
        Route::put('roles/{role}', [RoleController::class, 'update']);
        Route::delete('roles/{role}', [RoleController::class, 'destroy']);

        Route::get('permissions', [PermissionController::class, 'index']);

        // User management
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::get('users/{user}', [UserController::class, 'show']);
        Route::put('users/{user}', [UserController::class, 'update']);
        Route::delete('users/{user}', [UserController::class, 'destroy']);

        // CRM: clients & contacts
        Route::get('clients', [ClientController::class, 'index']);
        Route::post('clients', [ClientController::class, 'store']);
        Route::get('clients/{client}', [ClientController::class, 'show']);
        Route::put('clients/{client}', [ClientController::class, 'update']);
        Route::delete('clients/{client}', [ClientController::class, 'destroy']);

        Route::get('clients/{client}/contacts', [ClientContactController::class, 'index']);
        Route::post('clients/{client}/contacts', [ClientContactController::class, 'store']);
        Route::put('clients/{client}/contacts/{contact}', [ClientContactController::class, 'update']);
        Route::delete('clients/{client}/contacts/{contact}', [ClientContactController::class, 'destroy']);

        // Reference data: ports & vendors
        Route::get('ports', [PortController::class, 'index']);
        Route::post('ports', [PortController::class, 'store']);
        Route::put('ports/{port}', [PortController::class, 'update']);
        Route::delete('ports/{port}', [PortController::class, 'destroy']);

        Route::get('vendors', [VendorController::class, 'index']);
        Route::post('vendors', [VendorController::class, 'store']);
        Route::get('vendors/{vendor}', [VendorController::class, 'show']);
        Route::put('vendors/{vendor}', [VendorController::class, 'update']);
        Route::delete('vendors/{vendor}', [VendorController::class, 'destroy']);

        // Visits
        Route::get('visits', [VisitController::class, 'index']);
        Route::post('visits', [VisitController::class, 'store']);
        Route::get('visits/{visit}', [VisitController::class, 'show']);
        Route::put('visits/{visit}', [VisitController::class, 'update']);
        Route::delete('visits/{visit}', [VisitController::class, 'destroy']);

        // SD Forms
        Route::get('sd-forms', [SDFormController::class, 'index']);
        Route::post('sd-forms', [SDFormController::class, 'store']);
        Route::get('sd-forms/{sdForm}', [SDFormController::class, 'show']);
        Route::put('sd-forms/{sdForm}', [SDFormController::class, 'update']);
        Route::post('sd-forms/{sdForm}/submit', [SDFormController::class, 'submit']);
        Route::post('sd-forms/{sdForm}/link-shipment', [SDFormController::class, 'linkShipment']);

        // Shipments & operations
        Route::get('shipments', [ShipmentController::class, 'index']);
        Route::post('shipments', [ShipmentController::class, 'store']);
        Route::get('shipments/{shipment}', [ShipmentController::class, 'show']);
        Route::put('shipments/{shipment}', [ShipmentController::class, 'update']);

        Route::get('shipments/{shipment}/operations', [ShipmentOperationsController::class, 'show']);
        Route::put('shipments/{shipment}/operations', [ShipmentOperationsController::class, 'update']);

        Route::get('shipments/{shipment}/tasks', [ShipmentTaskController::class, 'index']);
        Route::put('shipments/{shipment}/tasks', [ShipmentTaskController::class, 'bulkUpdate']);

        // Financials
        Route::get('invoices', [InvoiceController::class, 'index']);
        Route::post('invoices', [InvoiceController::class, 'store']);
        Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::put('invoices/{invoice}', [InvoiceController::class, 'update']);
        Route::post('invoices/{invoice}/issue', [InvoiceController::class, 'issue']);
        Route::post('invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);

        Route::get('vendor-bills', [VendorBillController::class, 'index']);
        Route::post('vendor-bills', [VendorBillController::class, 'store']);
        Route::get('vendor-bills/{vendorBill}', [VendorBillController::class, 'show']);
        Route::put('vendor-bills/{vendorBill}', [VendorBillController::class, 'update']);

        Route::get('payments', [PaymentController::class, 'index']);
        Route::post('payments', [PaymentController::class, 'store']);

        Route::get('treasury/entries', [TreasuryEntryController::class, 'index']);

        Route::get('expense-categories', [ExpenseCategoryController::class, 'index']);
        Route::post('expense-categories', [ExpenseCategoryController::class, 'store']);
        Route::put('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update']);
        Route::delete('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy']);

        Route::get('expenses', [ExpenseController::class, 'index']);
        Route::post('expenses', [ExpenseController::class, 'store']);
        Route::get('expenses/{expense}', [ExpenseController::class, 'show']);
        Route::put('expenses/{expense}', [ExpenseController::class, 'update']);
        Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy']);

        // Notes
        Route::get('notes', [NoteController::class, 'index']);
        Route::post('notes', [NoteController::class, 'store']);
        Route::put('notes/{note}', [NoteController::class, 'update']);
        Route::delete('notes/{note}', [NoteController::class, 'destroy']);

        // Tickets
        Route::get('tickets', [TicketController::class, 'index']);
        Route::post('tickets', [TicketController::class, 'store']);
        Route::get('tickets/{ticket}', [TicketController::class, 'show']);
        Route::put('tickets/{ticket}', [TicketController::class, 'update']);
        Route::delete('tickets/{ticket}', [TicketController::class, 'destroy']);

        // Reporting
        Route::get('dashboard/overview', [DashboardController::class, 'overview']);
        Route::get('reports/shipments', [ReportController::class, 'shipments']);
        Route::get('reports/finance', [ReportController::class, 'finance']);
    });
});

