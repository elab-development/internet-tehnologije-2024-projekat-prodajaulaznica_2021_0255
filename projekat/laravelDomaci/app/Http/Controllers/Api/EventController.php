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

/**
     * @OA\Get(
     *     path="/api/events/export",
     *     summary="Export events to CSV or HTML format",
     *     tags={"Events"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="format",
     *         in="query",
     *         description="Export format (csv or html)",
     *         required=false,
     *         @OA\Schema(type="string", enum={"csv", "html"}, default="csv")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="File download",
     *         @OA\MediaType(
     *             mediaType="text/csv",
     *             @OA\Schema(type="string", format="binary")
     *         )
     *     ),
     *     @OA\Response(response=403, description="Unauthorized - Admin access required"),
     *     @OA\Response(response=400, description="Unsupported format")
     * )
     */
    public function exportEvents(Request $request)
    {
        // Proveri da li je korisnik admin
        if (!auth()->check() || !auth()->user()->is_admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.'
            ], 403);
        }

        $format = $request->get('format', 'csv');
        
        // Učitajte sve događaje sa kategorijama
        $events = Event::with('category')->orderBy('created_at', 'desc')->get();
        
        switch ($format) {
            case 'csv':
                return $this->exportEventsToCsv($events);
            case 'html':
                return $this->exportEventsToHtml($events);
            default:
                return response()->json([
                    'success' => false,
                    'message' => 'Unsupported format. Use csv or html.'
                ], 400);
        }
    }

    /**
     * Export events to CSV format
     */
    private function exportEventsToCsv($events)
    {
        $filename = 'events_' . date('Y-m-d_H-i-s') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ];
        
        $callback = function() use ($events) {
            $file = fopen('php://output', 'w');
            
            // UTF-8 BOM za Excel kompatibilnost
            fwrite($file, "\xEF\xBB\xBF");
            
            // Header red
            fputcsv($file, [
                'ID',
                'Naziv',
                'Opis',
                'Kategorija',
                'Lokacija',
                'Datum početka',
                'Datum završetka',
                'Cena (RSD)',
                'Ukupno karata',
                'Dostupne karte',
                'Prodane karte',
                'Popularno',
                'Status',
                'Kreiran',
                'Ažuriran'
            ]);
            
            // Podaci
            foreach ($events as $event) {
                fputcsv($file, [
                    $event->id,
                    $event->name,
                    strip_tags($event->description),
                    $event->category ? $event->category->name : 'N/A',
                    $event->location,
                    $event->start_date->format('d.m.Y H:i'),
                    $event->end_date->format('d.m.Y H:i'),
                    number_format($event->price, 2, ',', '.'),
                    $event->total_tickets,
                    $event->available_tickets,
                    $event->sold_tickets,
                    $event->featured ? 'Da' : 'Ne',
                    $event->isActive() ? 'Aktivan' : 'Završen',
                    $event->created_at->format('d.m.Y H:i'),
                    $event->updated_at->format('d.m.Y H:i')
                ]);
            }
            
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export events to HTML format
     */
    private function exportEventsToHtml($events)
    {
        $filename = 'events_' . date('Y-m-d_H-i-s') . '.html';
        
        $html = '<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Izvoz događaja - ' . date('d.m.Y H:i') . '</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 10px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .export-info { 
            text-align: center; 
            margin-bottom: 30px; 
            color: #666; 
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            text-align: center;
        }
        .stat-item {
            background: #007bff;
            color: white;
            padding: 15px;
            border-radius: 5px;
            min-width: 120px;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            display: block;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 14px;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        th { 
            background-color: #007bff; 
            color: white;
            font-weight: bold; 
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) { 
            background-color: #f9f9f9; 
        }
        tr:hover {
            background-color: #e3f2fd;
        }
        .price { text-align: right; font-weight: bold; }
        .center { text-align: center; }
        .status-active { 
            color: #28a745; 
            font-weight: bold;
            background: #d4edda;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .status-ended { 
            color: #6c757d;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .featured-row { 
            background-color: #fff3cd !important;
            border-left: 4px solid #ffc107;
        }
        .category-badge { 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white; 
            font-size: 12px;
            display: inline-block;
            font-weight: bold;
        }
        .event-name {
            font-weight: bold;
            color: #333;
        }
        .featured-star {
            color: #ffc107;
            font-size: 16px;
            margin-left: 5px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        @media print {
            body { margin: 0; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Izvoz događaja</h1>
        <div class="export-info">
            <p><strong>Generisan:</strong> ' . date('d.m.Y H:i:s') . '</p>
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-number">' . count($events) . '</span>
                    <span>Ukupno događaja</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">' . $events->where('featured', true)->count() . '</span>
                    <span>Popularni</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">' . $events->filter(function($e) { return $e->isActive(); })->count() . '</span>
                    <span>Aktivni</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">' . number_format($events->sum('sold_tickets')) . '</span>
                    <span>Prodane karte</span>
                </div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Naziv događaja</th>
                    <th>Kategorija</th>
                    <th>Lokacija</th>
                    <th>Datum početka</th>
                    <th>Datum završetka</th>
                    <th>Cena</th>
                    <th>Karte (D/U/P)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>';
        
        foreach ($events as $event) {
            $statusClass = $event->isActive() ? 'status-active' : 'status-ended';
            $statusText = $event->isActive() ? 'Aktivan' : 'Završen';
            $rowClass = $event->featured ? 'featured-row' : '';
            
            $html .= '<tr class="' . $rowClass . '">
                <td class="center">' . $event->id . '</td>
                <td>
                    <span class="event-name">' . htmlspecialchars($event->name) . '</span>
                    ' . ($event->featured ? '<span class="featured-star">★</span>' : '') . '
                </td>
                <td>
                    <span class="category-badge" style="background-color: ' . ($event->category->color ?? '#3498db') . '">
                        ' . htmlspecialchars($event->category ? $event->category->name : 'N/A') . '
                    </span>
                </td>
                <td>📍 ' . htmlspecialchars($event->location) . '</td>
                <td>' . $event->start_date->format('d.m.Y H:i') . '</td>
                <td>' . $event->end_date->format('d.m.Y H:i') . '</td>
                <td class="price">' . number_format($event->price, 2, ',', '.') . ' RSD</td>
                <td class="center">
                    <strong>' . $event->available_tickets . '</strong> / 
                    ' . $event->total_tickets . ' / 
                    <span style="color: #28a745;">' . $event->sold_tickets . '</span>
                </td>
                <td class="center">
                    <span class="' . $statusClass . '">' . $statusText . '</span>
                </td>
            </tr>';
        }
        
        $html .= '</tbody>
        </table>
        
        <div class="footer">
            <p><strong>Legenda:</strong></p>
            <p>★ - Popularni događaji | D/U/P - Dostupne / Ukupno / Prodane karte</p>
            <p>📍 - Lokacija | 📊 - Izvoz generisan automatski</p>
            <hr style="margin: 15px 0;">
            <p>© ' . date('Y') . ' Event Management System</p>
        </div>
    </div>
</body>
</html>';
        
        $headers = [
            'Content-Type' => 'text/html; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ];
        
        return response($html, 200, $headers);
    }
}