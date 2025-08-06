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
     * @OA\Tag(
     *     name="Events",
     *     description="Operations related to event management"
     * )
     */
    /**
     * @OA\Get(
     *     path="/api/events",
     *     summary="Get all events with optional filters",
     *     tags={"Events"},
     *     @OA\Parameter(
     *         name="category_id",
     *         in="query",
     *         description="Filter by category ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="available_only",
     *         in="query",
     *         description="Filter to only events with available tickets",
     *         @OA\Schema(type="boolean")
     *     ),
     *     @OA\Response(response=200, description="List of events")
     * )
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
     * @OA\Post(
     *     path="/api/events",
     *     summary="Create a new event",
     *     tags={"Events"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "description", "start_date", "end_date", "location", "price", "total_tickets", "category_id"},
     *             @OA\Property(property="name", type="string", example="Jazz Night"),
     *             @OA\Property(property="description", type="string", example="Live jazz event"),
     *             @OA\Property(property="image_url", type="string", format="url"),
     *             @OA\Property(property="thumbnail_url", type="string", format="url"),
     *             @OA\Property(property="start_date", type="string", format="date-time"),
     *             @OA\Property(property="end_date", type="string", format="date-time"),
     *             @OA\Property(property="location", type="string"),
     *             @OA\Property(property="price", type="number", format="float"),
     *             @OA\Property(property="total_tickets", type="integer"),
     *             @OA\Property(property="category_id", type="integer")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Event created successfully"),
     *     @OA\Response(response=422, description="Validation error")
     * )
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
     * @OA\Get(
     *     path="/api/events/{id}",
     *     summary="Get a specific event by ID",
     *     tags={"Events"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Event found"),
     *     @OA\Response(response=404, description="Event not found")
     * )
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
     * @OA\Put(
     *     path="/api/events/{id}",
     *     summary="Update an event",
     *     tags={"Events"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="start_date", type="string", format="date-time"),
     *             @OA\Property(property="end_date", type="string", format="date-time"),
     *             @OA\Property(property="location", type="string"),
     *             @OA\Property(property="price", type="number"),
     *             @OA\Property(property="total_tickets", type="integer"),
     *             @OA\Property(property="category_id", type="integer")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Event updated successfully"),
     *     @OA\Response(response=422, description="Validation failed")
     * )
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
     * @OA\Delete(
     *     path="/api/events/{id}",
     *     summary="Delete an event",
     *     tags={"Events"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Event deleted successfully"),
     *     @OA\Response(response=422, description="Cannot delete event with sold tickets")
     * )
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

    /**
     * @OA\Get(
     *     path="/api/categories/{categoryId}/events",
     *     summary="Get events by category",
     *     tags={"Events"},
     *     @OA\Parameter(
     *         name="categoryId",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Events for the category")
     * )
     */
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

        /**
     * @OA\Get(
     *     path="/api/events/{id}/tickets",
     *     summary="Get tickets info for an event",
     *     tags={"Events"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Ticket info returned")
     * )
     */
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