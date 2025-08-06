<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

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
     *     summary="Get all categories with event count",
     *     tags={"Categories"},
     *     @OA\Response(
     *         response=200,
     *         description="List of categories"
     *     )
     * )
     */
    public function index(): JsonResponse
    {
        $categories = Category::withCount('events')->get();
        return response()->json($categories);
    }

    /**
     * @OA\Post(
     *     path="/api/categories",
     *     summary="Create a new category",
     *     tags={"Categories"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "description", "color"},
     *             @OA\Property(property="name", type="string", example="Music"),
     *             @OA\Property(property="description", type="string", example="Concerts and musical events"),
     *             @OA\Property(property="color", type="string", example="#FF5733")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Category created successfully"
     *     ),
     *     @OA\Response(response=422, description="Validation failed")
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'color' => 'required|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/' // hex color format
        ]);

        $category = Category::create($request->only(['name', 'description', 'color']));

        return response()->json([
            'message' => 'Category created successfully',
            'category' => $category
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/api/categories/{id}",
     *     summary="Get a category with its events",
     *     tags={"Categories"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Category found"),
     *     @OA\Response(response=404, description="Category not found")
     * )
     */
    public function show($id): JsonResponse
    {
        $category = Category::with('events')->findOrFail($id);
        return response()->json($category);
    }

    /**
     * @OA\Put(
     *     path="/api/categories/{id}",
     *     summary="Update an existing category",
     *     tags={"Categories"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Updated Category"),
     *             @OA\Property(property="description", type="string", example="Updated description"),
     *             @OA\Property(property="color", type="string", example="#123456")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Category updated successfully"),
     *     @OA\Response(response=422, description="Validation error")
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
            'category' => $category
        ]);
    }

     /**
     * @OA\Delete(
     *     path="/api/categories/{id}",
     *     summary="Delete a category",
     *     tags={"Categories"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Category deleted successfully"),
     *     @OA\Response(response=422, description="Cannot delete category with associated events")
     * )
     */
    public function destroy($id): JsonResponse
    {
        $category = Category::findOrFail($id);
        
        // Proveriti da li postoje događaji povezani sa kategorijom
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
     *     summary="Get events for a specific category",
     *     tags={"Categories"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="List of events in the category"),
     *     @OA\Response(response=404, description="Category not found")
     * )
     */
    public function getEvents($id): JsonResponse
    {
        $category = Category::with(['events' => function($query) {
            $query->orderBy('start_date', 'asc');
        }])->findOrFail($id);

        return response()->json([
            'category' => $category->only(['id', 'name', 'description', 'color']),
            'events' => $category->events
        ]);
    }
}


