<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Event;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use App\Http\Resources\EventResource;

class EventController extends Controller
{
    /**
     * @OA\Get(
     * path="/api/events",
     * summary="Get a list of events with filtering, sorting, and pagination",
     * tags={"Events"},
     * @OA\Parameter(
     * name="search",
     * in="query",
     * description="Search term for event name, location, description, or category name",
     * required=false,
     * @OA\Schema(type="string")
     * ),
     * @OA\Parameter(
     * name="category_id",
     * in="query",
     * description="Filter events by category ID",
     * required=false,
     * @OA\Schema(type="integer")
     * ),
     * @OA\Parameter(
     * name="min_price",
     * in="query",
     * description="Filter events by minimum price",
     * required=false,
     * @OA\Schema(type="number", format="float")
     * ),
     * @OA\Parameter(
     * name="max_price",
     * in="query",
     * description="Filter events by maximum price",
     * required=false,
     * @OA\Schema(type="number", format="float")
     * ),
     * @OA\Parameter(
     * name="start_date",
     * in="query",
     * description="Filter events by start date (format: YYYY-MM-DD)",
     * required=false,
     * @OA\Schema(type="string", format="date")
     * ),
     * @OA\Parameter(
     * name="end_date",
     * in="query",
     * description="Filter events by end date (format: YYYY-MM-DD)",
     * required=false,
     * @OA\Schema(type="string", format="date")
     * ),
     * @OA\Parameter(
     * name="location",
     * in="query",
     * description="Filter events by location (partial match)",
     * required=false,
     * @OA\Schema(type="string")
     * ),
     * @OA\Parameter(
     * name="available_only",
     * in="query",
     * description="Filter to show only events with available tickets",
     * required=false,
     * @OA\Schema(type="string", enum={"true"})
     * ),
     * @OA\Parameter(
     * name="featured",
     * in="query",
     * description="Filter to show only featured events",
     * required=false,
     * @OA\Schema(type="string", enum={"true"})
     * ),
     * @OA\Parameter(
     * name="active_only",
     * in="query",
     * description="Filter to show only events that have not yet ended",
     * required=false,
     * @OA\Schema(type="string", enum={"true"})
     * ),
     * @OA\Parameter(
     * name="sort_by",
     * in="query",
     * description="Field to sort by",
     * required=false,
     * @OA\Schema(type="string", enum={"start_date", "price", "name", "created_at", "available_tickets"})
     * ),
     * @OA\Parameter(
     * name="sort_order",
     * in="query",
     * description="Sort direction",
     * required=false,
     * @OA\Schema(type="string", enum={"asc", "desc"})
     * ),
     * @OA\Parameter(
     * name="per_page",
     * in="query",
     * description="Number of events per page",
     * required=false,
     * @OA\Schema(type="integer", example=6)
     * ),
     * @OA\Response(
     * response=200,
     * description="Successful operation",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Events retrieved successfully"),
     * @OA\Property(property="data", type="object",
     * @OA\Property(property="data", type="array",
     * @OA\Items(ref="#/components/schemas/EventResource")
     * ),
     * @OA\Property(property="current_page", type="integer", example=1),
     * @OA\Property(property="last_page", type="integer", example=5),
     * @OA\Property(property="per_page", type="integer", example=6),
     * @OA\Property(property="total", type="integer", example=25),
     * @OA\Property(property="from", type="integer", example=1),
     * @OA\Property(property="to", type="integer", example=6),
     * @OA\Property(property="has_more_pages", type="boolean", example=true)
     * )
     * )
     * )
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = Event::with('category');
        
        // Advanced search functionality
        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                ->orWhere('description', 'like', "%{$searchTerm}%")
                ->orWhere('location', 'like', "%{$searchTerm}%")
                ->orWhereHas('category', function($categoryQuery) use ($searchTerm) {
                    $categoryQuery->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }
        
        // Category filter
        if ($request->has('category_id') && $request->category_id) {
            $query->where('category_id', $request->category_id);
        }
        
        // Price range filter
        if ($request->has('min_price') && is_numeric($request->min_price)) {
            $query->where('price', '>=', $request->min_price);
        }
        
        if ($request->has('max_price') && is_numeric($request->max_price)) {
            $query->where('price', '<=', $request->max_price);
        }
        
        // Date range filter
        if ($request->has('start_date') && $request->start_date) {
            $query->where('start_date', '>=', $request->start_date);
        }
        
        if ($request->has('end_date') && $request->end_date) {
            $query->where('end_date', '<=', $request->end_date);
        }
        
        // Location filter
        if ($request->has('location') && $request->location) {
            $query->where('location', 'like', "%{$request->location}%");
        }
        
        // Available tickets filter
        if ($request->has('available_only') && $request->available_only === 'true') {
            $query->where('available_tickets', '>', 0);
        }
        
        // Featured filter
        if ($request->has('featured') && $request->featured === 'true') {
            $query->where('featured', true);
        }
        
        // Active events only
        if ($request->has('active_only') && $request->active_only === 'true') {
            $query->where('end_date', '>', now());
        }
        
        // Sorting
        $sortBy = $request->get('sort_by', 'start_date');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $allowedSortFields = ['start_date', 'price', 'name', 'created_at', 'available_tickets'];
        if (in_array($sortBy, $allowedSortFields)) {
            $query->orderBy($sortBy, $sortOrder);
        }
        
        // Pagination
        $perPage = $request->get('per_page', 6);
        $perPage = min($perPage, 50); // Limit max per page
        
        $events = $query->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'message' => 'Events retrieved successfully',
            'data' => [
                'data' => EventResource::collection($events->items()),
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'per_page' => $events->perPage(),
                'total' => $events->total(),
                'from' => $events->firstItem(),
                'to' => $events->lastItem(),
                'has_more_pages' => $events->hasMorePages(),
            ]
        ]);
    }

    /**
     * @OA\Get(
     * path="/api/events/suggestions",
     * summary="Get search suggestions based on a search term",
     * tags={"Events"},
     * @OA\Parameter(
     * name="term",
     * in="query",
     * required=true,
     * description="The search term to get suggestions for",
     * @OA\Schema(type="string")
     * ),
     * @OA\Response(
     * response=200,
     * description="Suggestions retrieved successfully",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="data", type="array",
     * @OA\Items(
     * @OA\Property(property="type", type="string", example="event"),
     * @OA\Property(property="value", type="string", example="Concert in the Park"),
     * @OA\Property(property="label", type="string", example="Concert in the Park")
     * )
     * )
     * )
     * )
     * )
     */
    public function searchSuggestions(Request $request): JsonResponse
    {
        $term = $request->get('term', '');
        
        if (strlen($term) < 2) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }
        
        $suggestions = [];
        
        // Event names
        $eventNames = Event::where('name', 'like', "%{$term}%")
            ->select('name')
            ->distinct()
            ->limit(5)
            ->pluck('name');
        
        foreach ($eventNames as $name) {
            $suggestions[] = [
                'type' => 'event',
                'value' => $name,
                'label' => $name
            ];
        }
        
        // Locations
        $locations = Event::where('location', 'like', "%{$term}%")
            ->select('location')
            ->distinct()
            ->limit(3)
            ->pluck('location');
        
        foreach ($locations as $location) {
            $suggestions[] = [
                'type' => 'location',
                'value' => $location,
                'label' => "📍 {$location}"
            ];
        }
        
        // Categories
        $categories = Category::where('name', 'like', "%{$term}%")
            ->select('name')
            ->limit(3)
            ->pluck('name');
        
        foreach ($categories as $category) {
            $suggestions[] = [
                'type' => 'category',
                'value' => $category,
                'label' => "🏷️ {$category}"
            ];
        }
        
        return response()->json([
            'success' => true,
            'data' => array_slice($suggestions, 0, 10)
        ]);
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
        'image_url' => 'nullable|string',
        'thumbnail_url' => 'nullable|string',
        'start_date' => 'required|date',
        'end_date' => 'required|date|after:start_date',
        'location' => 'required|string|max:255',
        'price' => 'required|numeric|min:0',
        'total_tickets' => 'required|integer|min:1',
        'category_id' => 'required|exists:categories,id',
        'featured' => 'sometimes|boolean'
    ]);


    try {
        $eventData = $request->only([
            'name', 'description', 'image_url', 'thumbnail_url',
            'start_date', 'end_date', 'location', 'price',
            'total_tickets', 'category_id', 'featured'
        ]);


        $eventData['available_tickets'] = $eventData['total_tickets'];


        $event = Event::create($eventData);
        $event->load('category');


        return response()->json([
            'success' => true,
            'message' => 'Event created successfully',
            'data' => new EventResource($event)
        ], 201);


    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error creating event: ' . $e->getMessage(),
            'data' => null
        ], 500);
    }
}

    /**
     * @OA\Get(
     * path="/api/events/{id}",
     * summary="Get a single event by ID",
     * tags={"Events"},
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * description="ID of the event to retrieve",
     * @OA\Schema(type="integer")
     * ),
     * @OA\Response(
     * response=200,
     * description="Event retrieved successfully",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Event retrieved successfully"),
     * @OA\Property(property="data", ref="#/components/schemas/EventResource")
     * )
     * ),
     * @OA\Response(
     * response=404,
     * description="Event not found",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=false),
     * @OA\Property(property="message", type="string", example="Event not found"),
     * @OA\Property(property="data", type="null")
     * )
     * ),
     * @OA\Response(
     * response=500,
     * description="Error retrieving event",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=false),
     * @OA\Property(property="message", type="string", example="Error retrieving event"),
     * @OA\Property(property="data", type="null")
     * )
     * )
     * )
     */
    // Updated show method in EventController
    public function show($id): JsonResponse
    {
        try {
            $event = Event::with(['category', 'tickets' => function($query) {
                $query->where('status', 'active');
            }])->findOrFail($id);

            return response()->json([
                'success' => true,
                'message' => 'Event retrieved successfully',
                'data' => new EventResource($event)
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
                'data' => null
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving event',
                'data' => null
            ], 500);
        }
    }
 
      /**
     * @OA\Put(
     * path="/api/events/{id}",
     * operationId="updateEvent",
     * tags={"Events"},
     * summary="Ažuriranje postojećeg događaja",
     * description="Ažurira podatke za događaj sa prosleđenim ID-jem. Sva polja su opciona.",
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * description="ID događaja za ažuriranje",
     * @OA\Schema(type="string", format="uuid")
     * ),
     * @OA\RequestBody(
     * required=true,
     * description="Podaci za ažuriranje događaja",
     * @OA\JsonContent(
     * type="object",
     * @OA\Property(property="name", type="string", example="Updated Tech Conference 2025"),
     * @OA\Property(property="description", type="string", example="An updated description of the biggest tech conference in the region."),
     * @OA\Property(property="image_url", type="string", format="uri", example="https://example.com/images/event_new.jpg"),
     * @OA\Property(property="thumbnail_url", type="string", format="uri", example="https://example.com/images/event_thumb_new.jpg"),
     * @OA\Property(property="start_date", type="string", format="date-time", example="2025-10-21 09:00:00"),
     * @OA\Property(property="end_date", type="string", format="date-time", example="2025-10-22 17:00:00"),
     * @OA\Property(property="location", type="string", example="Belgrade, Serbia"),
     * @OA\Property(property="price", type="number", format="float", example=55.00),
     * @OA\Property(property="total_tickets", type="integer", example=600),
     * @OA\Property(property="category_id", type="string", format="uuid", example="9cde5f4d-6a56-4b13-9cf6-95333f24f86d"),
     * @OA\Property(property="featured", type="boolean", example=false)
     * )
     * ),
     * @OA\Response(
     * response=200,
     * description="Uspešno ažuriran događaj",
     * @OA\JsonContent(
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Event updated successfully"),
     * @OA\Property(property="data", ref="#/components/schemas/EventResource")
     * )
     * ),
     * @OA\Response(response=404, description="Događaj nije pronađen"),
     * @OA\Response(response=422, description="Greška pri validaciji (npr. ukupan broj karata je manji od prodatih)"),
     * @OA\Response(response=500, description="Serverska greška")
     * )
     */
   public function update(Request $request, string $id): JsonResponse
    {
        try {
            $event = Event::findOrFail($id);
            
            $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'sometimes|string',
                'image_url' => 'nullable|url|max:500',
                'thumbnail_url' => 'nullable|url|max:500',
                'start_date' => 'sometimes|date',
                'end_date' => 'sometimes|date|after:start_date',
                'location' => 'sometimes|string|max:255',
                'price' => 'sometimes|numeric|min:0',
                'total_tickets' => 'sometimes|integer|min:1',
                'available_tickets' => 'sometimes|integer|min:0',
                'category_id' => 'sometimes|exists:categories,id',
                'featured' => 'sometimes|boolean'
            ]);

            // Check if total_tickets is being reduced below sold tickets
            if ($request->has('total_tickets')) {
                $soldTickets = $event->total_tickets - $event->available_tickets;
                
                if ($request->total_tickets < $soldTickets) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot reduce total tickets below sold tickets ({$soldTickets})",
                        'errors' => [
                            'total_tickets' => ["Total tickets cannot be less than sold tickets ({$soldTickets})"]
                        ]
                    ], 422);
                }

                // Update available tickets proportionally
                if ($request->has('available_tickets')) {
                    $event->available_tickets = $request->available_tickets;
                } else {
                    // Calculate new available tickets
                    $newAvailable = $request->total_tickets - $soldTickets;
                    $event->available_tickets = max(0, $newAvailable);
                }
            }

            // Update only provided fields
            $updateData = $request->only([
                'name', 'description', 'image_url', 'thumbnail_url',
                'start_date', 'end_date', 'location', 'price',
                'total_tickets', 'category_id', 'featured'
            ]);

            $event->update($updateData);
            $event->load('category');

            return response()->json([
                'success' => true,
                'message' => 'Event updated successfully',
                'data' => new EventResource($event)
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
                'data' => null
            ], 404);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating event',
                'data' => null
            ], 500);
        }
    }


    /**
 * @OA\Delete(
 *     path="/api/events/{id}",
 *     summary="Delete an event",
 *     description="Deletes an event by ID. If the event has sold tickets (active or used), deletion will fail with a 422 response. If the event is currently active, a warning will be logged.",
 *     operationId="deleteEvent",
 *     tags={"Events"},
 *     security={{"sanctum":{}}},
 *     
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         description="ID of the event to delete",
 *         required=true,
 *         @OA\Schema(type="string")
 *     ),
 *     
 *     @OA\Response(
 *         response=200,
 *         description="Event deleted successfully",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="message", type="string", example="Event deleted successfully")
 *         )
 *     ),
 *     
 *     @OA\Response(
 *         response=404,
 *         description="Event not found",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=false),
 *             @OA\Property(property="message", type="string", example="Event not found"),
 *             @OA\Property(property="data", type="string", nullable=true, example=null)
 *         )
 *     ),
 *     
 *     @OA\Response(
 *         response=422,
 *         description="Cannot delete event with sold tickets",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=false),
 *             @OA\Property(property="message", type="string", example="Cannot delete event with sold tickets (5 tickets sold)"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="sold_tickets_count", type="integer", example=5),
 *                 @OA\Property(property="can_force_delete", type="boolean", example=false)
 *             )
 *         )
 *     ),
 *     
 *     @OA\Response(
 *         response=500,
 *         description="Error deleting event",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=false),
 *             @OA\Property(property="message", type="string", example="Error deleting event"),
 *             @OA\Property(property="data", type="string", nullable=true, example=null)
 *         )
 *     )
 * )
 */
    public function destroy(string $id): JsonResponse
    {
        try {
            $event = Event::with('tickets')->findOrFail($id);
            
            // Check if event has sold tickets
            $soldTicketsCount = $event->tickets()->whereIn('status', ['active', 'used'])->count();
            
            if ($soldTicketsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete event with sold tickets ({$soldTicketsCount} tickets sold)",
                    'data' => [
                        'sold_tickets_count' => $soldTicketsCount,
                        'can_force_delete' => false // Could be used for admin override
                    ]
                ], 422);
            }
            
            // Check if event is currently active
            $isActive = $event->start_date <= now() && $event->end_date > now();
            
            if ($isActive) {
                // Log the deletion of an active event
                \Log::warning('Active event deleted', [
                    'event_id' => $event->id,
                    'event_name' => $event->name,
                    'deleted_by' => auth()->id()
                ]);
            }
            
            // Delete the event (this will cascade delete tickets due to foreign key constraint)
            $event->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Event deleted successfully'
            ]);
            
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
                'data' => null
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error deleting event', [
                'event_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error deleting event',
                'data' => null
            ], 500);
        }
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

    public function uploadImage(Request $request): JsonResponse
{
    $request->validate([
        'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
        'type' => 'required|in:main,thumbnail'
    ]);


    try {
        $image = $request->file('image');
        $type = $request->get('type', 'main');
        
        // Generate unique filename
        $filename = time() . '_' . $type . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
        
        // Store in public/storage/events directory
        $path = $image->storeAs('events', $filename, 'public');
        
        // Generate full URL
        $imageUrl = asset('storage/' . $path);
        
        return response()->json([
            'success' => true,
            'message' => 'Image uploaded successfully',
            'data' => [
                'url' => $imageUrl,
                'path' => $path,
                'filename' => $filename,
                'type' => $type
            ]
        ]);


    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error uploading image: ' . $e->getMessage(),
            'data' => null
        ], 500);
    }
}

}