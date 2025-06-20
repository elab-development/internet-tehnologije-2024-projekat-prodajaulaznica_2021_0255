<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Event;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class EventController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Event::with('category');
        
        // Filtriranje po kategoriji
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        // Filtriranje po dostupnosti ulaznica
        if ($request->has('available_only') && $request->available_only) {
            $query->where('available_tickets', '>', 0);
        }
        
        // Sortiranje po datumu početka
        $events = $query->orderBy('start_date', 'asc')->paginate(15);
        
        return response()->json($events);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'image_url' => 'nullable|url',
            'thumbnail_url' => 'nullable|url',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'location' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'total_tickets' => 'required|integer|min:1',
            'category_id' => 'required'
        ]);

        $event = Event::create([
            'name' => $request->name,
            'description' => $request->description,
            'image_url' => $request->image_url,
            'thumbnail_url' => $request->thumbnail_url,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'location' => $request->location,
            'price' => $request->price,
            'total_tickets' => $request->total_tickets,
            'available_tickets' => $request->total_tickets, // inicijalno svi su dostupni
            'category_id' => $request->category_id
        ]);

        $event->load('category');

        return response()->json([
            'message' => 'Event created successfully',
            'event' => $event
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id): JsonResponse
    {
        $event = Event::with('category')->findOrFail($id);

        if (!$event) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found'
            ]);
        }

        return response()->json($event);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'image_url' => 'nullable|url',
            'thumbnail_url' => 'nullable|url',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'location' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'total_tickets' => 'sometimes|integer|min:1',
            'category_id' => 'sometimes|exists:categories,id'
        ]);

        // Samo ažurirati polja koja postoje u bazi
        $event->update($request->only([
            'name', 'description', 'image_url', 'thumbnail_url',
            'start_date', 'end_date', 'location', 'price',
            'total_tickets', 'category_id'
        ]));

        $event->load('category');

        return response()->json([
            'message' => 'Event updated successfully',
            'event' => $event
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        
        // Proveriti da li postoje prodane ulaznice
        if ($event->tickets()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete event with sold tickets'
            ], 422);
        }
        
        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully'
        ]);
    }

    // Dodatne rute
    public function getEventsByCategory($categoryId): JsonResponse
    {
        $category = Category::findOrFail($categoryId);
        $events = Event::where('category_id', $category->id)
                      ->with('category')
                      ->orderBy('start_date', 'asc')
                      ->get();

        return response()->json([
            'category' => $category,
            'events' => $events
        ]);
    }

    public function getEventTickets($id): JsonResponse
    {
        $event = Event::with(['tickets.user'])->findOrFail($id);

        return response()->json([
            'event' => $event->only(['id', 'name', 'start_date', 'end_date']),
            'total_tickets' => $event->total_tickets,
            'sold_tickets' => $event->sold_tickets,
            'available_tickets' => $event->available_tickets,
            'tickets' => $event->tickets
        ]);
    }
}