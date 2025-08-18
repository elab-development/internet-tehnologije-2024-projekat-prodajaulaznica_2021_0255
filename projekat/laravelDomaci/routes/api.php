<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\QueueController;

Route::middleware(['api.errors', 'api.response'])->group(function () {

    Route::get('csrf-cookie', [AuthController::class, 'csrf']);

    Route::get('documentation', function () {
        return redirect('/api/documentation');
    });

    // Public routes (no authentication required)
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    // Public access to events (read-only)
    Route::get('events', [EventController::class, 'index']);
    Route::get('events/{id}', [EventController::class, 'show']);
    Route::get('events/category/{categoryId}', [EventController::class, 'getEventsByCategory']);
    Route::get('events/{id}/tickets', [EventController::class, 'getEventTickets']);
    Route::get('events/search/suggestions', [EventController::class, 'searchSuggestions']);

    // Public access to categories
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('categories/{id}', [CategoryController::class, 'show']);
    Route::get('categories/{id}/events', [CategoryController::class, 'getEvents']);
    Route::get('categories/{id}/statistics', [CategoryController::class, 'getStatistics']);

    // Public ticket validation
    Route::get('tickets/validate/{ticketNumber}', [TicketController::class, 'validateTicket']);
    Route::post('tickets/validate/bulk', [TicketController::class, 'validateBulk']);
    Route::get('events/{eventId}/cancellation-policy', [TicketController::class, 'getCancellationPolicy']);
    Route::post('tickets/validate/qr-code', [TicketController::class, 'validateQRCode']);

    // Queue routes
    Route::post('queue/join', [QueueController::class, 'joinQueue']);
    Route::get('queue/status', [QueueController::class, 'checkQueueStatus']);
    Route::delete('queue/leave', [QueueController::class, 'leaveQueue']);
    Route::get('queue/stats', [QueueController::class, 'getQueueStats']);

    // Protected routes (authentication required)
    Route::middleware('auth:sanctum')->group(function () {
        // Auth routes
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('user', [AuthController::class, 'user']);

        // Admin routes
        Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
            Route::get('dashboard/overview', [AdminDashboardController::class, 'getOverviewStats']);
            Route::get('dashboard/revenue-chart', [AdminDashboardController::class, 'getRevenueChart']);
            Route::get('dashboard/category-stats', [AdminDashboardController::class, 'getCategoryStats']);
            Route::get('dashboard/top-events', [AdminDashboardController::class, 'getTopEvents']);
            Route::get('dashboard/recent-activity', [AdminDashboardController::class, 'getRecentActivity']);
            Route::get('dashboard/upcoming-events', [AdminDashboardController::class, 'getUpcomingEvents']);

            // Admin queue management - DODAJ OVE RUTE
            Route::prefix('queue')->group(function () {
            Route::post('enable', [QueueController::class, 'enableQueue']);
            Route::post('disable', [QueueController::class, 'disableQueue']);
            Route::post('max-users', [QueueController::class, 'setMaxUsers']);
            Route::get('stats', [QueueController::class, 'getQueueStats']);
            Route::delete('clear-waiting', [QueueController::class, 'clearWaitingQueue']);
            Route::delete('clear-expired', [QueueController::class, 'clearExpiredSessions']);
            Route::post('activate-next', [QueueController::class, 'activateNextInQueue']);
    });
        });

        // Events - CRUD operations for authenticated users
        Route::post('events', [EventController::class, 'store']);
        Route::put('events/{id}', [EventController::class, 'update']);
        Route::delete('events/{id}', [EventController::class, 'destroy']);
        Route::post('events/upload-image', [EventController::class, 'uploadImage']);

        // Categories - CRUD operations for authenticated users
        Route::post('categories', [CategoryController::class, 'store']);
        Route::put('categories/{id}', [CategoryController::class, 'update']);
        Route::delete('categories/{id}', [CategoryController::class, 'destroy']);
        
        // Tickets
        Route::post('tickets/purchase', [TicketController::class, 'purchaseTicket']);
        Route::get('tickets/my', [TicketController::class, 'myTickets']);
        Route::get('tickets/{id}', [TicketController::class, 'show']);
        Route::put('tickets/{id}/cancel', [TicketController::class, 'cancel']);
        Route::put('tickets/{id}/mark-used', [TicketController::class, 'markAsUsed']);
        Route::get('events/{eventId}/validation-stats', [TicketController::class, 'getValidationStats']);
        
        // Enhanced ticket management
        Route::get('tickets/stats', [TicketController::class, 'getTicketStats']);
        Route::get('tickets/{id}/download', [TicketController::class, 'downloadTicket']);
        Route::get('tickets/purchase-history/export', [TicketController::class, 'exportPurchaseHistory']);
        Route::get('tickets/purchase-summary', [TicketController::class, 'getPurchaseSummary']);
        
        // QR code management
        Route::get('tickets/{id}/qr-code', [TicketController::class, 'getQRCode']);
        Route::get('tickets/{id}/pdf', [TicketController::class, 'generateTicketPDF']);
        Route::get('tickets/{id}/receipt', [TicketController::class, 'generateReceipt']);
    });



    // Debug route for testing
    Route::post('debug', function (Request $request) {
        return response()->json([
            'message' => 'API endpoint hit',
            'data' => $request->all()
        ], 201);
    });
});