<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ticket;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Http\Resources\TicketResource;

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

        // Check if user owns the ticket
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

        // Check if event has already started
        if ($ticket->event->start_date <= now()) {
            return response()->json([
                'message' => 'Cannot cancel ticket for events that have already started'
            ], 422);
        }

        $ticket->update(['status' => 'cancelled']);
        
        // Return tickets to available count
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
     *     @OA\Response(response=200, description="Ticket validation result"),
     *     @OA\Response(response=404, description="Invalid ticket number"),
     *     @OA\Response(response=500, description="Validation error")
     * )
     */
    public function validateTicket($ticketNumber): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event.category', 'user'])
                ->where('ticket_number', $ticketNumber)
                ->first();

            if (!$ticket) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid ticket number',
                    'valid' => false,
                    'data' => null
                ], 404);
            }

            $validationResult = $this->validateTicketStatus($ticket);

            return response()->json([
                'success' => true,
                'message' => $validationResult['message'],
                'valid' => $validationResult['valid'],
                'data' => $validationResult['valid'] ? new TicketResource($ticket) : null,
                'validation_details' => $validationResult['details']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error validating ticket',
                'valid' => false,
                'data' => null
            ], 500);
        }
    }

    /**
     * Enhanced ticket validation with detailed checks
     */
    private function validateTicketStatus(Ticket $ticket): array
    {
        $now = now();
        $event = $ticket->event;
        
        // Check ticket status
        if ($ticket->status !== 'active') {
            return [
                'valid' => false,
                'message' => 'Ticket is ' . $ticket->status,
                'details' => [
                    'status' => $ticket->status,
                    'reason' => 'ticket_inactive'
                ]
            ];
        }

        // Check if event has started
        if ($event->start_date > $now) {
            return [
                'valid' => false,
                'message' => 'Event has not started yet',
                'details' => [
                    'event_start' => $event->start_date,
                    'current_time' => $now,
                    'reason' => 'event_not_started'
                ]
            ];
        }

        // Check if event has ended
        if ($event->end_date < $now) {
            return [
                'valid' => false,
                'message' => 'Event has already ended',
                'details' => [
                    'event_end' => $event->end_date,
                    'current_time' => $now,
                    'reason' => 'event_ended'
                ]
            ];
        }

        // Check if ticket is within valid time window (e.g., 1 hour before event start)
        $validFromTime = $event->start_date->subHour();
        if ($now < $validFromTime) {
            return [
                'valid' => false,
                'message' => 'Ticket validation opens 1 hour before event start',
                'details' => [
                    'valid_from' => $validFromTime,
                    'current_time' => $now,
                    'reason' => 'validation_window_not_open'
                ]
            ];
        }

        // All checks passed
        return [
            'valid' => true,
            'message' => 'Valid ticket',
            'details' => [
                'ticket_status' => $ticket->status,
                'event_status' => 'active',
                'validation_time' => $now,
                'reason' => 'valid'
            ]
        ];
    }

    /**
     * @OA\Post(
     *     path="/api/tickets/validate/bulk",
     *     summary="Bulk ticket validation for entry scanning",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"ticket_numbers"},
     *             @OA\Property(
     *                 property="ticket_numbers",
     *                 type="array",
     *                 maxItems=50,
     *                 @OA\Items(type="string")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=200, description="Bulk validation results")
     * )
     */
    public function validateBulk(Request $request): JsonResponse
    {
        $request->validate([
            'ticket_numbers' => 'required|array|max:50',
            'ticket_numbers.*' => 'required|string'
        ]);

        $results = [];
        
        foreach ($request->ticket_numbers as $ticketNumber) {
            $ticket = Ticket::with(['event.category', 'user'])
                ->where('ticket_number', $ticketNumber)
                ->first();

            if (!$ticket) {
                $results[] = [
                    'ticket_number' => $ticketNumber,
                    'valid' => false,
                    'message' => 'Ticket not found'
                ];
                continue;
            }

            $validationResult = $this->validateTicketStatus($ticket);
            $results[] = [
                'ticket_number' => $ticketNumber,
                'valid' => $validationResult['valid'],
                'message' => $validationResult['message'],
                'ticket' => $validationResult['valid'] ? new TicketResource($ticket) : null
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Bulk validation completed',
            'data' => $results,
            'summary' => [
                'total' => count($results),
                'valid' => count(array_filter($results, fn($r) => $r['valid'])),
                'invalid' => count(array_filter($results, fn($r) => !$r['valid']))
            ]
        ]);
    }

    /**
     * @OA\Put(
     *     path="/api/tickets/{id}/mark-used",
     *     summary="Mark a ticket as used (for entry)",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Ticket marked as used"),
     *     @OA\Response(response=404, description="Ticket not found"),
     *     @OA\Response(response=422, description="Ticket not valid for use"),
     *     @OA\Response(response=500, description="Server error")
     * )
     */
    public function markAsUsed($id): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event', 'user'])->findOrFail($id);

            // Validate ticket before marking as used
            $validationResult = $this->validateTicketStatus($ticket);
            
            if (!$validationResult['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $validationResult['message'],
                    'data' => null
                ], 422);
            }

            // Check if ticket is already used
            if ($ticket->status === 'used') {
                return response()->json([
                    'success' => false,
                    'message' => 'Ticket has already been used',
                    'data' => [
                        'used_at' => $ticket->updated_at,
                        'ticket' => new TicketResource($ticket)
                    ]
                ], 422);
            }

            // Mark as used
            $ticket->update([
                'status' => 'used',
                'used_at' => now()
            ]);

            // Log the usage
            \Log::info('Ticket marked as used', [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'event_id' => $ticket->event_id,
                'user_id' => $ticket->user_id,
                'marked_by' => auth()->id(),
                'used_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ticket marked as used successfully',
                'data' => new TicketResource($ticket)
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket not found',
                'data' => null
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error marking ticket as used',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/events/{eventId}/validation-stats",
     *     summary="Get ticket validation statistics for an event",
     *     tags={"Tickets"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="eventId",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(response=200, description="Validation statistics"),
     *     @OA\Response(response=404, description="Event not found")
     * )
     */
    public function getValidationStats($eventId): JsonResponse
    {
        try {
            $event = Event::findOrFail($eventId);
            
            $stats = [
                'total_tickets' => $event->tickets()->count(),
                'active_tickets' => $event->tickets()->where('status', 'active')->count(),
                'used_tickets' => $event->tickets()->where('status', 'used')->count(),
                'cancelled_tickets' => $event->tickets()->where('status', 'cancelled')->count(),
                'validation_rate' => 0,
                'recent_validations' => []
            ];

            if ($stats['total_tickets'] > 0) {
                $stats['validation_rate'] = ($stats['used_tickets'] / $stats['total_tickets']) * 100;
            }

            // Get recent validations (last 10)
            $recentValidations = $event->tickets()
                ->where('status', 'used')
                ->with('user')
                ->orderBy('updated_at', 'desc')
                ->limit(10)
                ->get();

            $stats['recent_validations'] = $recentValidations->map(function($ticket) {
                return [
                    'ticket_number' => $ticket->ticket_number,
                    'user_name' => $ticket->user->name,
                    'used_at' => $ticket->updated_at,
                    'time_ago' => $ticket->updated_at->diffForHumans()
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Validation statistics retrieved successfully',
                'data' => $stats
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
                'data' => null
            ], 404);
        }
    }
}