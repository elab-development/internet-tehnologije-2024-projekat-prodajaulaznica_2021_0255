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
     * name="Categories",
     * description="Operations related to category management"
     * )
     */
    
    /**
     * @OA\Get(
     * path="/api/categories",
     * summary="Get all categories with active event count, sorted by name",
     * tags={"Categories"},
     * @OA\Response(
     * response=200,
     * description="List of categories",
     * @OA\JsonContent(
     * type="object",
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Categories retrieved successfully"),
     * @OA\Property(
     * property="data",
     * type="array",
     * @OA\Items(ref="#/components/schemas/CategoryResource")
     * )
     * )
     * )
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
     * path="/api/categories",
     * summary="Create a new category",
     * tags={"Categories"},
     * security={{"bearerAuth":{}}},
     * @OA\RequestBody(
     * required=true,
     * @OA\JsonContent(
     * required={"name", "description", "color"},
     * @OA\Property(property="name", type="string", example="Music"),
     * @OA\Property(property="description", type="string", example="Concerts and musical events"),
     * @OA\Property(property="color", type="string", example="#FF5733")
     * )
     * ),
     * @OA\Response(
     * response=201,
     * description="Category created successfully"
     * ),
     * @OA\Response(response=422, description="Validation failed")
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
     * path="/api/categories/{id}",
     * summary="Get a specific category with its active events",
     * tags={"Categories"},
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * @OA\Schema(type="integer")
     * ),
     * @OA\Response(
     * response=200,
     * description="Category found",
     * @OA\JsonContent(
     * type="object",
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Category retrieved successfully"),
     * @OA\Property(property="data", ref="#/components/schemas/CategoryResource")
     * )
     * ),
     * @OA\Response(response=404, description="Category not found")
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
     * path="/api/categories/{id}",
     * summary="Update an existing category",
     * tags={"Categories"},
     * security={{"bearerAuth":{}}},
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * @OA\Schema(type="integer")
     * ),
     * @OA\RequestBody(
     * @OA\JsonContent(
     * @OA\Property(property="name", type="string", example="Updated Category"),
     * @OA\Property(property="description", type="string", example="Updated description"),
     * @OA\Property(property="color", type="string", example="#123456")
     * )
     * ),
     * @OA\Response(response=200, description="Category updated successfully"),
     * @OA\Response(response=422, description="Validation error")
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
     * path="/api/categories/{id}",
     * summary="Delete a category",
     * tags={"Categories"},
     * security={{"bearerAuth":{}}},
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * @OA\Schema(type="integer")
     * ),
     * @OA\Response(response=200, description="Category deleted successfully"),
     * @OA\Response(response=422, description="Cannot delete category with associated events")
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
     * path="/api/categories/{id}/events",
     * summary="Get paginated list of active events for a specific category",
     * tags={"Categories"},
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * @OA\Schema(type="integer")
     * ),
     * @OA\Response(
     * response=200,
     * description="Paginated list of events in the category",
     * @OA\JsonContent(
     * type="object",
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Category events retrieved successfully"),
     * @OA\Property(
     * property="data",
     * type="object",
     * @OA\Property(property="category", ref="#/components/schemas/CategoryResource"),
     * @OA\Property(
     * property="events",
     * type="object",
     * @OA\Property(
     * property="data",
     * type="array",
     * @OA\Items(ref="#/components/schemas/EventResource")
     * ),
     * @OA\Property(property="current_page", type="integer", example=1),
     * @OA\Property(property="last_page", type="integer", example=3),
     * @OA\Property(property="per_page", type="integer", example=12),
     * @OA\Property(property="total", type="integer", example=30)
     * )
     * )
     * )
     * ),
     * @OA\Response(response=404, description="Category not found")
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
     * path="/api/categories/{id}/statistics",
     * summary="Get statistics for a specific category",
     * tags={"Categories"},
     * @OA\Parameter(
     * name="id",
     * in="path",
     * required=true,
     * @OA\Schema(type="integer")
     * ),
     * @OA\Response(
     * response=200,
     * description="Category statistics retrieved successfully",
     * @OA\JsonContent(
     * type="object",
     * @OA\Property(property="success", type="boolean", example=true),
     * @OA\Property(property="message", type="string", example="Category statistics retrieved successfully"),
     * @OA\Property(
     * property="data",
     * type="object",
     * @OA\Property(property="category", ref="#/components/schemas/CategoryResource"),
     * @OA\Property(
     * property="statistics",
     * type="object",
     * @OA\Property(property="total_events", type="integer", example=50),
     * @OA\Property(property="active_events", type="integer", example=15),
     * @OA\Property(property="total_tickets_sold", type="integer", example=1200),
     * @OA\Property(property="upcoming_events", type="integer", example=5),
     * @OA\Property(property="average_price", type="number", format="float", example=25.50)
     * )
     * )
     * )
     * ),
     * @OA\Response(response=404, description="Category not found")
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