<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Category;
use App\Models\Ticket;
use Illuminate\Http\Request;

class WebController extends Controller
{
    public function home()
    {
        $totalEvents = Event::count();
        $totalCategories = Category::count();
        $totalTickets = Ticket::count();
        $upcomingEvents = Event::where('start_date', '>', now())
                              ->with('category')
                              ->orderBy('start_date', 'asc')
                              ->limit(6)
                              ->get();

        return view('home', compact('totalEvents', 'totalCategories', 'totalTickets', 'upcomingEvents'));
    }

    public function events(Request $request)
    {
        $query = Event::with('category');
        
        // Filtriranje po kategoriji
        if ($request->has('category') && $request->category != '') {
            $query->where('category_id', $request->category);
        }
        
        // Filtriranje po dostupnosti
        if ($request->has('available') && $request->available == '1') {
            $query->where('available_tickets', '>', 0);
        }
        
        // Pretraga po imenu
        if ($request->has('search') && $request->search != '') {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        
        // Sortiranje
        $sortBy = $request->get('sort', 'start_date');
        $sortDirection = $request->get('direction', 'asc');
        
        if (in_array($sortBy, ['start_date', 'name', 'price'])) {
            $query->orderBy($sortBy, $sortDirection);
        }
        
        $events = $query->paginate(9)->withQueryString();
        $categories = Category::all();
        
        return view('events.index', compact('events', 'categories'));
    }

    public function showEvent($id)
    {
        $event = Event::with('category', 'tickets.user')->findOrFail($id);
        $relatedEvents = Event::where('category_id', $event->category_id)
                             ->where('id', '!=', $event->id)
                             ->limit(3)
                             ->get();
        
        return view('events.show', compact('event', 'relatedEvents'));
    }

    public function categories()
    {
        $categories = Category::withCount('events')->paginate(8);
        
        return view('categories.index', compact('categories'));
    }

    public function categoryEvents($id, Request $request)
    {
        $category = Category::findOrFail($id);
        $events = Event::where('category_id', $id)
                      ->with('category')
                      ->orderBy('start_date', 'asc')
                      ->paginate(9);
        
        return view('categories.events', compact('category', 'events'));
    }
}
