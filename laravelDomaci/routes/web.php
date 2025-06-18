<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebController;

Route::get('/', [WebController::class, 'home'])->name('home');
Route::get('/events', [WebController::class, 'events'])->name('events.index');
Route::get('/events/{id}', [WebController::class, 'showEvent'])->name('events.show');
Route::get('/categories', [WebController::class, 'categories'])->name('categories.index');
Route::get('/categories/{id}/events', [WebController::class, 'categoryEvents'])->name('categories.events');
