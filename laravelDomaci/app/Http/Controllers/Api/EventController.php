<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Event;
use App\Models\Category;

class EventController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $events = Event::with('category')->get();
        return response()->json($events);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'event_date' => 'required|date|after:now',
            'location' => 'required|string|max:255',
            'ticket_price' => 'required|numeric|min:0',
            'available_tickets' => 'required|integer|min:1',
            'category_id' => 'required|exists:categories,id'
        ]);

        $event = Event::create($request->all());
        $event->load('category');

        return response()->json([
            'message' => 'Event created successfully',
            'event' => $event
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $event = Event::with('category')->findOrFail($id);
        return response()->json($event);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $event = Event::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'event_date' => 'sometimes|required|date|after:now',
            'location' => 'sometimes|required|string|max:255',
            'ticket_price' => 'sometimes|required|numeric|min:0',
            'available_tickets' => 'sometimes|required|integer|min:1',
            'category_id' => 'sometimes|required|exists:categories,id'
        ]);

        $event->update($request->all());
        $event->load('category');

        return response()->json([
            'message' => 'Event updated successfully',
            'event' => $event
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $event = Event::findOrFail($id);
        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully'
        ]);
    }

    // Dodatne rute
    public function getEventsByCategory($categorySlug)
    {
        $category = Category::where('slug', $categorySlug)->firstOrFail();
        $events = Event::where('category_id', $category->id)->with('category')->get();

        return response()->json([
            'category' => $category,
            'events' => $events
        ]);
    }

    public function getEventTickets($id)
    {
        $event = Event::with(['tickets.user'])->findOrFail($id);

        return response()->json([
            'event' => $event->only(['id', 'title', 'event_date']),
            'total_tickets' => $event->available_tickets,
            'sold_tickets' => $event->sold_tickets,
            'remaining_tickets' => $event->remaining_tickets,
            'tickets' => $event->tickets
        ]);
    }
}
