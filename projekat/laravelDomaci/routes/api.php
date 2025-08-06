<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\TicketController;

Route::middleware('api.response')->group(function () {

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

// Public access to categories
Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/{id}', [CategoryController::class, 'show']);
Route::get('categories/{id}/events', [CategoryController::class, 'getEvents']);

// Public ticket validation
Route::get('tickets/validate/{ticketNumber}', [TicketController::class, 'validateTicket']);

// Protected routes (authentication required)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('logout', [AuthController::class, 'logout']);
    
    // Events - CRUD operations for authenticated users
    Route::post('events', [EventController::class, 'store']);
    Route::put('events/{id}', [EventController::class, 'update']);
    Route::delete('events/{id}', [EventController::class, 'destroy']);
    
    // Categories - CRUD operations for authenticated users
    Route::post('categories', [CategoryController::class, 'store']);
    Route::put('categories/{id}', [CategoryController::class, 'update']);
    Route::delete('categories/{id}', [CategoryController::class, 'destroy']);
    
    // Tickets
    Route::post('tickets/purchase', [TicketController::class, 'purchaseTicket']);
    Route::get('tickets/my', [TicketController::class, 'myTickets']);
    Route::get('tickets/{id}', [TicketController::class, 'show']);
    Route::patch('tickets/{id}/cancel', [TicketController::class, 'cancel']);
    Route::patch('tickets/{id}/use', [TicketController::class, 'markAsUsed']);
});

// Debug route for testing
Route::post('debug', function (Request $request) {
    return response()->json([
        'message' => 'API endpoint hit',
        'data' => $request->all()
    ], 201);
});

});