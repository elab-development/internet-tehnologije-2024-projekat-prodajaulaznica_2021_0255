<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Event; // Dodato za getEvents metodu
use Illuminate\Http\JsonResponse;
use App\Http\Resources\CategoryResource; // Dodato za korišćenje resursa
use App\Http\Resources\EventResource; // Dodato za korišćenje resursa
use Illuminate\Database\Eloquent\ModelNotFoundException; // Dodato za hvatanje izuzetaka

class CategoryController extends Controller
{
    /**
     * @OA\Tag(
     *     name="Categories",
     *     description="Operations related to category management"
     * )
     */
    
    /**
     * @OA\Get(
     *     path="/api/categories",
     *     summary="Get all categories with active event count",
     *     description="Retrieve all categories sorted by name with count of active events (events with end_date > current date)",
     *     operationId="getCategoriesIndex",
     *     tags={"Categories"},
     *     @OA\Response(
     *         response=200,
     *         description="Categories retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Categories retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/CategoryResource")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Internal server error")
     *         )
     *     )
     * )
     */
    public function index(): JsonResponse
    {
        $categories = Category::withCount(['events' => function($query) {
            $query->where('end_date', '>', now()); // Samo aktivni događaji
        }])->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'message' => 'Categories retrieved successfully',
            'data' => CategoryResource::collection($categories)
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/categories",
     *     summary="Create a new category",
     *     description="Create a new category with name, description and color. Requires authentication.",
     *     operationId="createCategory",
     *     tags={"Categories"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         description="Category data",
     *         @OA\JsonContent(
     *             required={"name", "description", "color"},
     *             @OA\Property(property="name", type="string", maxLength=255, example="Music", description="Category name"),
     *             @OA\Property(property="description", type="string", example="Concerts and musical events", description="Category description"),
     *             @OA\Property(property="color", type="string", maxLength=7, pattern="^#[0-9A-Fa-f]{6}$", example="#FF5733", description="Hex color code")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Category created successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Category created successfully"),
     *             @OA\Property(property="category", ref="#/components/schemas/CategoryResource")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation failed",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="The given data was invalid."),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="name", type="array", @OA\Items(type="string")),
     *                 @OA\Property(property="description", type="array", @OA\Items(type="string")),
     *                 @OA\Property(property="color", type="array", @OA\Items(type="string"))
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Unauthenticated.")
     *         )
     *     )
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'color' => 'required|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/'
        ]);

        $category = Category::create($request->only(['name', 'description', 'color']));

        return response()->json([
            'message' => 'Category created successfully',
            'category' => new CategoryResource($category)
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/api/categories/{id}",
     *     summary="Get a specific category with its active events",
     *     description="Retrieve a specific category by ID with its active events (end_date > current date) ordered by start_date",
     *     operationId="getCategoryById",
     *     tags={"Categories"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Category ID",
     *         @OA\Schema(type="integer", minimum=1, example=1)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Category retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Category retrieved successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/CategoryResource")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Category not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Category not found"),
     *             @OA\Property(property="data", type="null", example=null)
     *         )
     *     )
     * )
     */
    public function show($id): JsonResponse
    {
        try {
            $category = Category::with(['events' => function($query) {
                $query->where('end_date', '>', now())
                      ->orderBy('start_date', 'asc');
            }])->findOrFail($id);

            return response()->json([
                'success' => true,
                'message' => 'Category retrieved successfully',
                'data' => new CategoryResource($category)
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'data' => null
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/categories/{id}",
     *     summary="Update an existing category",
     *     description="Update category details. All fields are optional. Name must be unique. Requires authentication.",
     *     operationId="updateCategory",
     *     tags={"Categories"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Category ID to update",
     *         @OA\Schema(type="integer", minimum=1, example=1)
     *     ),
     *     @OA\RequestBody(
     *         required=false,
     *         description="Category update data (all fields optional)",
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", maxLength=255, example="Updated Category", description="Category name (must be unique)"),
     *             @OA\Property(property="description", type="string", example="Updated description", description="Category description"),
     *             @OA\Property(property="color", type="string", maxLength=7, pattern="^#[0-9A-Fa-f]{6}$", example="#123456", description="Hex color code")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Category updated successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Category updated successfully"),
     *             @OA\Property(property="category", ref="#/components/schemas/CategoryResource")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Category not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="No query results for model [App\\Models\\Category]")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="The given data was invalid."),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(property="name", type="array", @OA\Items(type="string")),
     *                 @OA\Property(property="color", type="array", @OA\Items(type="string"))
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Unauthenticated.")
     *         )
     *     )
     * )
     */
    public function update(Request $request, $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        
        $request->validate([
            'name' => 'sometimes|string|max:255|unique:categories,name,' . $id,
            'description' => 'sometimes|string',
            'color' => 'sometimes|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/'
        ]);

        $category->update($request->only(['name', 'description', 'color']));

        return response()->json([
            'message' => 'Category updated successfully',
            'category' => new CategoryResource($category)
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/categories/{id}",
     *     summary="Delete a category",
     *     description="Delete a category if it has no associated events. Requires authentication.",
     *     operationId="deleteCategory",
     *     tags={"Categories"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Category ID to delete",
     *         @OA\Schema(type="integer", minimum=1, example=1)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Category deleted successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Category deleted successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Category not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="No query results for model [App\\Models\\Category]")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Cannot delete category with associated events",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Cannot delete category with associated events")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string", example="Unauthenticated.")
     *         )
     *     )
     * )
     */
    public function destroy($id): JsonResponse
    {
        $category = Category::findOrFail($id);
        
        if ($category->events()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete category with associated events'
            ], 422);
        }
        
        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully'
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/categories/{id}/events",
     *     summary="Get paginated list of active events for a specific category",
     *     description="Retrieve paginated active events (end_date > current date) for a specific category, ordered by start_date ascending. Returns 12 events per page.",
     *     operationId="getCategoryEvents",
     *     tags={"Categories"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Category ID",
     *         @OA\Schema(type="integer", minimum=1, example=1)
     *     ),
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         required=false,
     *         description="Page number for pagination",
     *         @OA\Schema(type="integer", minimum=1, default=1, example=1)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Category events retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Category events retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="category", ref="#/components/schemas/CategoryResource"),
     *                 @OA\Property(
     *                     property="events",
     *                     type="object",
     *                     @OA\Property(
     *                         property="data",
     *                         type="array",
     *                         @OA\Items(ref="#/components/schemas/EventResource")
     *                     ),
     *                     @OA\Property(property="current_page", type="integer", example=1, description="Current page number"),
     *                     @OA\Property(property="last_page", type="integer", example=3, description="Last page number"),
     *                     @OA\Property(property="per_page", type="integer", example=12, description="Items per page"),
     *                     @OA\Property(property="total", type="integer", example=30, description="Total number of events")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Category not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Category not found"),
     *             @OA\Property(property="data", type="null", example=null)
     *         )
     *     )
     * )
     */
    public function getEvents($id): JsonResponse
    {
        try {
            $category = Category::findOrFail($id);
            
            $events = Event::where('category_id', $id)
                ->with('category')
                ->where('end_date', '>', now())
                ->orderBy('start_date', 'asc')
                ->paginate(12);

            return response()->json([
                'success' => true,
                'message' => 'Category events retrieved successfully',
                'data' => [
                    'category' => new CategoryResource($category),
                    'events' => [
                        'data' => EventResource::collection($events->items()),
                        'current_page' => $events->currentPage(),
                        'last_page' => $events->lastPage(),
                        'per_page' => $events->perPage(),
                        'total' => $events->total(),
                    ]
                ]
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'data' => null
            ], 404);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/categories/{id}/statistics",
     *     summary="Get comprehensive statistics for a specific category",
     *     description="Retrieve detailed statistics for a category including total events, active events, ticket sales, upcoming events, and average price",
     *     operationId="getCategoryStatistics",
     *     tags={"Categories"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Category ID",
     *         @OA\Schema(type="integer", minimum=1, example=1)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Category statistics retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Category statistics retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="category", ref="#/components/schemas/CategoryResource"),
     *                 @OA\Property(
     *                     property="statistics",
     *                     type="object",
     *                     @OA\Property(property="total_events", type="integer", example=50, description="Total number of events in this category"),
     *                     @OA\Property(property="active_events", type="integer", example=15, description="Number of active events (end_date > now)"),
     *                     @OA\Property(property="total_tickets_sold", type="integer", example=1200, description="Total active tickets sold for this category"),
     *                     @OA\Property(property="upcoming_events", type="integer", example=5, description="Number of upcoming events (start_date > now)"),
     *                     @OA\Property(property="average_price", type="number", format="float", example=25.50, nullable=true, description="Average price of active events in this category")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Category not found",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Category not found"),
     *             @OA\Property(property="data", type="null", example=null)
     *         )
     *     )
     * )
     */
    public function getStatistics($id): JsonResponse
    {
        try {
            $category = Category::findOrFail($id);
            
            $stats = [
                'total_events' => $category->events()->count(),
                'active_events' => $category->events()->where('end_date', '>', now())->count(),
                'total_tickets_sold' => $category->events()
                    ->join('tickets', 'events.id', '=', 'tickets.event_id')
                    ->where('tickets.status', 'active')
                    ->count(),
                'upcoming_events' => $category->events()
                    ->where('start_date', '>', now())
                    ->count(),
                'average_price' => $category->events()
                    ->where('end_date', '>', now())
                    ->avg('price')
            ];

            return response()->json([
                'success' => true,
                'message' => 'Category statistics retrieved successfully',
                'data' => [
                    'category' => new CategoryResource($category),
                    'statistics' => $stats
                ]
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
                'data' => null
            ], 404);
        }
    }
}