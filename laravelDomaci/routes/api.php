<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\CategoryController;

// Javne rute (bez autentifikacije)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Javni pristup događajima (čitanje)
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{id}', [EventController::class, 'show']);
Route::get('/events/category/{category}', [EventController::class, 'getEventsByCategory']);
Route::get('/events/{id}/tickets', [EventController::class, 'getEventTickets']);

// Javni pristup kategorijama
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);

// Zaštićene rute (potrebna autentifikacija)
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth rute
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Resource rute za događaje (CRUD) - samo za autentifikovane
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{id}', [EventController::class, 'update']);
    Route::delete('/events/{id}', [EventController::class, 'destroy']);
    
    // Kategorije - kreiranje samo za autentifikovane
    Route::post('/categories', [CategoryController::class, 'store']);
    
    // Ulaznice
    Route::post('/tickets/purchase', [TicketController::class, 'purchaseTicket']);
    Route::get('/tickets/my', [TicketController::class, 'myTickets']);
    Route::get('/tickets/{id}', [TicketController::class, 'show']);
    
    // Test ruta za proveru autentifikacije
    Route::get('/user', function (Request $request) {
        return response()->json([
            'user' => $request->user(),
            'message' => 'Authenticated successfully'
        ]);
    });
});

// Fallback za nepostojece rute
Route::fallback(function() {
    return response()->json([
        'message' => 'API endpoint not found'
    ], 404);
});