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
 * @OA\Post(
 *     path="/api/tickets/purchase",
 *     summary="Purchase a ticket for an event",
 *     description="Purchases a ticket for a specific event. Requires the event to be valid and have available tickets. Optionally applies a discount percentage.",
 *     operationId="purchaseTicket",
 *     tags={"Tickets"},
 *     security={{"sanctum":{}}},
 *     
 *     @OA\RequestBody(
 *         required=true,
 *         @OA\JsonContent(
 *             required={"event_id"},
 *             @OA\Property(property="event_id", type="integer", example=1, description="ID of the event"),
 *             @OA\Property(property="discount_percentage", type="number", format="float", minimum=0, maximum=100, example=10, nullable=true)
 *         )
 *     ),
 *     
 *     @OA\Response(
 *         response=201,
 *         description="Ticket purchased successfully",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="message", type="string", example="Ticket purchased successfully"),
 *             @OA\Property(property="data", type="object", description="Ticket resource returned")
 *         )
 *     ),
 *     
 *     @OA\Response(
 *         response=422,
 *         description="Validation failed or event not purchasable",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=false),
 *             @OA\Property(property="message", type="string", example="No tickets available for this event")
 *         )
 *     ),
 *     
 *     @OA\Response(
 *         response=500,
 *         description="Server error while purchasing ticket",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=false),
 *             @OA\Property(property="message", type="string", example="Error purchasing ticket: Internal Server Error")
 *         )
 *     )
 * )
 */

public function purchaseTicket(Request $request): JsonResponse
{
    $request->validate([
        'event_id' => 'required|exists:events,id',
        'discount_percentage' => 'nullable|numeric|min:0|max:100'
    ]);

    try {
        DB::beginTransaction();

        $event = Event::lockForUpdate()->findOrFail($request->event_id);

        // Check if event is available for purchase
        if (!$event->canPurchaseTickets()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot purchase tickets for this event'
            ], 422);
        }

        // Check ticket availability
        if (!$event->hasAvailableTickets()) {
            return response()->json([
                'success' => false,
                'message' => 'No tickets available for this event'
            ], 422);
        }

        $discountPercentage = $request->discount_percentage ?? 0;
        $finalPrice = $event->price * (1 - $discountPercentage / 100);

        $ticket = Ticket::create([
            'ticket_number' => $this->generateTicketNumber(),
            'qr_code' => Str::uuid(),
            'price' => $finalPrice,
            'discount_percentage' => $discountPercentage,
            'status' => 'active',
            'purchase_date' => now(),
            'event_id' => $request->event_id,
            'user_id' => auth()->id()
        ]);

        // Update available tickets
        $event->decrement('available_tickets');

        $ticket->load(['event.category', 'user']);

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Ticket purchased successfully',
            'data' => new TicketResource($ticket)
        ], 201);

    } catch (\Exception $e) {
        DB::rollback();
        
        return response()->json([
            'success' => false,
            'message' => 'Error purchasing ticket: ' . $e->getMessage()
        ], 500);
    }
}

private function generateTicketNumber(): string
{
    do {
        $number = 'TKT-' . strtoupper(Str::random(8));
    } while (Ticket::where('ticket_number', $number)->exists());

    return $number;
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