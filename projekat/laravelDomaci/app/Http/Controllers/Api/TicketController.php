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
    /**
    * @OA\Tag(
    *     name="Tickets",
    *     description="Operations related to ticket management"
    * )
    */

    /**
     * @OA\Post(
     *     path="/api/tickets/purchase",
     *     summary="Purchase a ticket for an event",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"event_id"},
     *             @OA\Property(property="event_id", type="integer", example=1),
     *             @OA\Property(property="discount_percentage", type="number", example=10)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Ticket purchased successfully"),
     *     @OA\Response(response=422, description="Validation failed or no tickets available")
     * )
     */
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

       /**
     * @OA\Get(
     *     path="/api/tickets/my",
     *     summary="Get tickets for the authenticated user",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="List of user's tickets")
     * )
     */
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

    /**
     * @OA\Get(
     *     path="/api/tickets/{id}",
     *     summary="Get a single ticket by ID",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Ticket details"),
     *     @OA\Response(response=403, description="Unauthorized access"),
     *     @OA\Response(response=404, description="Ticket not found")
     * )
     */
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

        /**
     * @OA\Put(
     *     path="/api/tickets/{id}/cancel",
     *     summary="Cancel a ticket",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Ticket cancelled"),
     *     @OA\Response(response=422, description="Cannot cancel ticket")
     * )
     */
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

    /**
     * @OA\Get(
     *     path="/api/tickets/validate/{ticketNumber}",
     *     summary="Validate a ticket by ticket number",
     *     tags={"Tickets"},
     *     @OA\Parameter(
     *         name="ticketNumber",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(response=200, description="Ticket is valid"),
     *     @OA\Response(response=404, description="Invalid ticket number")
     * )
     */
    public function validateTicket($ticketNumber): JsonResponse
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

        $isValid = $ticket->status === 'active';

        return response()->json([
            'valid' => $isValid,
            'ticket' => $isValid ? $ticket : null,
            'message' => $isValid ? 'Valid ticket' : 'Invalid, expired or cancelled ticket'
        ]);
    }

 /**
     * @OA\Put(
     *     path="/api/tickets/{id}/mark-used",
     *     summary="Mark a ticket as used",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Ticket marked as used"),
     *     @OA\Response(response=422, description="Ticket not active")
     * )
     */
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