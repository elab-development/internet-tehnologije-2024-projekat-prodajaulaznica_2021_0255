<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::withCount('events')->get();
        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:categories',
            'description' => 'required|string',
            'color' => 'required|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/' // hex color format
        ]);

        $category = Category::create($request->only(['name', 'description', 'color']));

        return response()->json([
            'message' => 'Category created successfully',
            'category' => $category
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $category = Category::with('events')->findOrFail($id);
        return response()->json($category);
    }

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

    // Dodatna metoda za dobijanje događaja po kategoriji
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


