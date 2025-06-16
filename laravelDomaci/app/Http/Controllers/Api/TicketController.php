<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ticket;
use App\Models\Event;

class TicketController extends Controller
{
    public function purchaseTicket(Request $request)
    {
        $request->validate([
            'event_id' => 'required|exists:events,id'
        ]);

        $event = Event::findOrFail($request->event_id);

        if (!$event->hasAvailableTickets()) {
            return response()->json([
                'message' => 'No tickets available for this event'
            ], 400);
        }

        $ticket = Ticket::create([
            'user_id' => $request->user()->id,
            'event_id' => $request->event_id,
            'purchase_date' => now(),
            'ticket_code' => Ticket::generateTicketCode(),
            'status' => 'active'
        ]);

        $ticket->load(['event', 'user']);

        return response()->json([
            'message' => 'Ticket purchased successfully',
            'ticket' => $ticket
        ], 201);
    }

    public function myTickets(Request $request)
    {
        $tickets = Ticket::where('user_id', $request->user()->id)
            ->with(['event.category'])
            ->orderBy('purchase_date', 'desc')
            ->get();

        return response()->json([
            'tickets' => $tickets
        ]);
    }

    public function show($id)
    {
        $ticket = Ticket::with(['event.category', 'user'])->findOrFail($id);

        // Proveri da li je korisnik vlasnik ulaznice
        if ($ticket->user_id !== auth()->id()) {
            return response()->json([
                'message' => 'Unauthorized access to ticket'
            ], 403);
        }

        return response()->json($ticket);
    }
}
