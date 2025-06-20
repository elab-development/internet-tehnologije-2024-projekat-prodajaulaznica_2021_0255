<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\CategoryController;


// Javne rute (bez autentifikacije)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


// Javni pristup događajima (čitanje)
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{id}', [EventController::class, 'show']);
Route::get('/events/category/{categoryId}', [EventController::class, 'getEventsByCategory']);
Route::get('/events/{id}/tickets', [EventController::class, 'getEventTickets']);


// Javni pristup kategorijama
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::get('/categories/{id}/events', [CategoryController::class, 'getEvents']);


// Javni pristup ulaznicama
Route::get('/tickets/validate/{ticketNumber}', [TicketController::class, 'validate']);


// Zaštićene rute (potrebna autentifikacija)
Route::middleware('auth:sanctum')->group(function () {
   
    // Auth rute
    Route::post('/logout', [AuthController::class, 'logout']);
   
    // Događaji - CRUD operacije za autentifikovane korisnike
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{id}', [EventController::class, 'update']);
    Route::delete('/events/{id}', [EventController::class, 'destroy']);
   
    // Kategorije - CRUD operacije za autentifikovane korisnike
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
   
    // Ulaznice
    Route::post('/tickets/purchase', [TicketController::class, 'purchaseTicket']);
    Route::get('/tickets/my', [TicketController::class, 'myTickets']);
    Route::get('/tickets/{id}', [TicketController::class, 'show']);
    Route::patch('/tickets/{id}/cancel', [TicketController::class, 'cancel']);
    Route::patch('/tickets/{id}/use', [TicketController::class, 'markAsUsed']);
   
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

Route::post('/debug', function(Request $request) {
    return response()->json([
        'message' => 'Debug endpoint hit',
        'data' => $request->all()
    ], 201);
});