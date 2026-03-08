<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\ClientContactController;
use App\Http\Controllers\Api\V1\ClientAttachmentController;
use App\Http\Controllers\Api\V1\CompanyTypeController;
use App\Http\Controllers\Api\V1\PreferredCommMethodController;
use App\Http\Controllers\Api\V1\InterestLevelController;
use App\Http\Controllers\Api\V1\DecisionMakerTitleController;
use App\Http\Controllers\Api\V1\LeadSourceController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\VisitController;
use App\Http\Controllers\Api\V1\ShipmentController;

Route::prefix('v1')->group(function () {
    // Public auth routes
    Route::post('auth/login', [AuthController::class, 'login']);

    // Routes below require authentication
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Profile APIs
        Route::get('profile', [AuthController::class, 'profile']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::put('profile/password', [AuthController::class, 'updatePassword']);

        // Roles & page permissions
        Route::get('roles', [RoleController::class, 'index']);

        Route::get('permissions', [PermissionController::class, 'index']);
        Route::post('permissions', [PermissionController::class, 'store']);
        Route::get('permissions/{role}', [PermissionController::class, 'showByRole']);
        Route::delete('permissions/{permission}', [PermissionController::class, 'destroy']);

        // User management
        Route::get('users', [UserController::class, 'index']);
        Route::post('users', [UserController::class, 'store']);
        Route::get('users/{user}', [UserController::class, 'show']);
        Route::put('users/{user}', [UserController::class, 'update']);
        Route::delete('users/{user}', [UserController::class, 'destroy']);
        Route::put('users/{user}/password', [UserController::class, 'updatePassword']);
        Route::post('users/{user}/assign-role', [UserController::class, 'assignRole']);
        Route::post('users/{user}/activate', [UserController::class, 'activate']);
        Route::post('users/{user}/deactivate', [UserController::class, 'deactivate']);

        // Client lookups (company type, comm method, interest level, decision maker title, lead source)
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
        Route::post('clients/bulk-assign', [ClientController::class, 'bulkAssignSales'])
            ->middleware('page_permission:clients,edit');
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

        Route::get('clients/{client}/attachments', [ClientAttachmentController::class, 'index'])
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

        // Shipments
        Route::get('shipments', [ShipmentController::class, 'index']);
        Route::post('shipments', [ShipmentController::class, 'store']);
        Route::get('shipments/{shipment}', [ShipmentController::class, 'show']);
        Route::put('shipments/{shipment}', [ShipmentController::class, 'update']);

        // Visits (follow-ups / communication log)
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
    });
});

