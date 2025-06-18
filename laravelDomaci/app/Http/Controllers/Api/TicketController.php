<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ticket;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    public function purchaseTicket(Request $request): JsonResponse
    {
        $request->validate([
            'event_id' => 'required|exists:events,id',
            'discount_percentage' => 'nullable|numeric|min:0|max:100'
        ]);

        $event = Event::findOrFail($request->event_id);

        // Proveriti dostupnost ulaznica
        if (!$event->hasAvailableTickets()) {
            return response()->json([
                'message' => 'No tickets available for this event'
            ], 422);
        }

        // Proveriti da li je događaj još uvek aktivan za kupovinu
        if (!$event->canPurchaseTickets()) {
            return response()->json([
                'message' => 'Cannot purchase tickets for past events or events that have started'
            ], 422);
        }

        $discountPercentage = $request->discount_percentage ?? 0;
        $finalPrice = $event->price * (1 - $discountPercentage / 100);

        $ticket = Ticket::create([
            'ticket_number' => Ticket::generateTicketNumber(),
            'qr_code' => Str::uuid(),
            'price' => $finalPrice,
            'discount_percentage' => $discountPercentage,
            'status' => 'active',
            'purchase_date' => now(),
            'event_id' => $request->event_id,
            'user_id' => $request->user()->id
        ]);

        // Ažurirati broj dostupnih ulaznica
        $event->decrement('available_tickets');

        $ticket->load(['event.category', 'user']);

        return response()->json([
            'message' => 'Ticket purchased successfully',
            'ticket' => $ticket
        ], 201);
    }

    public function myTickets(Request $request): JsonResponse
    {
        $tickets = Ticket::where('user_id', $request->user()->id)
            ->with(['event.category'])
            ->orderBy('purchase_date', 'desc')
            ->get();

        return response()->json([
            'tickets' => $tickets
        ]);
    }

    public function show($id): JsonResponse
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

    public function cancel($id): JsonResponse
    {
        $ticket = Ticket::where('user_id', auth()->id())->findOrFail($id);

        if ($ticket->status === 'cancelled') {
            return response()->json([
                'message' => 'Ticket is already cancelled'
            ], 422);
        }

        if ($ticket->status === 'used') {
            return response()->json([
                'message' => 'Cannot cancel used ticket'
            ], 422);
        }

        // Proveriti da li je događaj već počeo
        if ($ticket->event->start_date <= now()) {
            return response()->json([
                'message' => 'Cannot cancel ticket for events that have already started'
            ], 422);
        }

        $ticket->update(['status' => 'cancelled']);
        
        // Vratiti ulaznice u dostupne
        $ticket->event->increment('available_tickets');

        return response()->json([
            'message' => 'Ticket cancelled successfully'
        ]);
    }

    // Javna metoda za validaciju ulaznica (npr. na ulazu)
    public function validate($ticketNumber): JsonResponse
    {
        $ticket = Ticket::with('event', 'user')
                       ->where('ticket_number', $ticketNumber)
                       ->first();

        if (!$ticket) {
            return response()->json([
                'message' => 'Invalid ticket number',
                'valid' => false
            ], 404);
        }

        $isValid = $ticket->status === 'active' && 
                  $ticket->event->start_date <= now() &&
                  $ticket->event->end_date > now();

        return response()->json([
            'valid' => $isValid,
            'ticket' => $isValid ? $ticket : null,
            'message' => $isValid ? 'Valid ticket' : 'Invalid, expired or cancelled ticket'
        ]);
    }

    // Označiti ulaznica kao iskorišćenu
    public function markAsUsed($id): JsonResponse
    {
        $ticket = Ticket::findOrFail($id);

        if ($ticket->status !== 'active') {
            return response()->json([
                'message' => 'Ticket is not active'
            ], 422);
        }

        $ticket->update(['status' => 'used']);

        return response()->json([
            'message' => 'Ticket marked as used',
            'ticket' => $ticket
        ]);
    }
}