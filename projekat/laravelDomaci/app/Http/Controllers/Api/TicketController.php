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
     *             @OA\Property(property="discount_percentage", type="number", format="float", minimum=0, maximum=100, example=10, nullable=true, description="Optional discount percentage to apply")
     *         )
     *     ),
     *     
     *     @OA\Response(
     *         response=201,
     *         description="Ticket purchased successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Ticket purchased successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/TicketResource")
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
     *     summary="Get tickets for the authenticated user with filtering and pagination",
     *     description="Retrieves paginated list of user's tickets with optional filtering by status, search, and sorting capabilities",
     *     operationId="myTickets",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Parameter(
     *         name="status",
     *         in="query",
     *         description="Filter by ticket status",
     *         required=false,
     *         @OA\Schema(type="string", enum={"active", "used", "cancelled", "all"}, default="all")
     *     ),
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search in event name or location",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="sortBy",
     *         in="query",
     *         description="Sort by field",
     *         required=false,
     *         @OA\Schema(type="string", enum={"purchase_date", "event_date", "price", "status"}, default="purchase_date")
     *     ),
     *     @OA\Parameter(
     *         name="sortOrder",
     *         in="query",
     *         description="Sort order",
     *         required=false,
     *         @OA\Schema(type="string", enum={"asc", "desc"}, default="desc")
     *     ),
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Items per page",
     *         required=false,
     *         @OA\Schema(type="integer", minimum=1, maximum=100, default=10)
     *     ),
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         description="Page number",
     *         required=false,
     *         @OA\Schema(type="integer", minimum=1, default=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="User tickets retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="User tickets retrieved successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="tickets", type="array", @OA\Items(ref="#/components/schemas/TicketResource")),
     *                 @OA\Property(property="pagination", type="object",
     *                     @OA\Property(property="current_page", type="integer", example=1),
     *                     @OA\Property(property="last_page", type="integer", example=5),
     *                     @OA\Property(property="per_page", type="integer", example=10),
     *                     @OA\Property(property="total", type="integer", example=45)
     *                 ),
     *                 @OA\Property(property="stats", type="object",
     *                     @OA\Property(property="total", type="integer", example=45),
     *                     @OA\Property(property="active", type="integer", example=12),
     *                     @OA\Property(property="used", type="integer", example=30),
     *                     @OA\Property(property="cancelled", type="integer", example=3),
     *                     @OA\Property(property="total_spent", type="number", format="float", example=1250.75),
     *                     @OA\Property(property="upcoming_events", type="integer", example=5)
     *                 )
     *             )
     *         )
     *     ),
     *     
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving tickets"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function myTickets(Request $request): JsonResponse
    {
        try {
            $query = Ticket::with(['event.category'])
                ->where('user_id', auth()->id());

            // Apply filters
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('search') && $request->search) {
                $searchTerm = $request->search;
                $query->whereHas('event', function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('location', 'like', "%{$searchTerm}%");
                });
            }

            // Apply sorting
            $sortBy = $request->get('sortBy', 'purchase_date');
            $sortOrder = $request->get('sortOrder', 'desc');

            switch ($sortBy) {
                case 'event_date':
                    $query->join('events', 'tickets.event_id', '=', 'events.id')
                          ->orderBy('events.start_date', $sortOrder)
                          ->select('tickets.*');
                    break;
                case 'price':
                    $query->orderBy('price', $sortOrder);
                    break;
                case 'status':
                    $query->orderBy('status', $sortOrder);
                    break;
                default:
                    $query->orderBy('purchase_date', $sortOrder);
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $tickets = $query->paginate($perPage);

            // Get user ticket statistics
            $stats = $this->getUserTicketStats(auth()->id());

            return response()->json([
                'success' => true,
                'message' => 'User tickets retrieved successfully',
                'data' => [
                    'tickets' => TicketResource::collection($tickets->items()),
                    'pagination' => [
                        'current_page' => $tickets->currentPage(),
                        'last_page' => $tickets->lastPage(),
                        'per_page' => $tickets->perPage(),
                        'total' => $tickets->total(),
                    ],
                    'stats' => $stats
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving tickets',
                'data' => null
            ], 500);
        }
    }

    /**
     * Add method for user ticket statistics
     */
    private function getUserTicketStats($userId): array
    {
        $tickets = Ticket::where('user_id', $userId);
        
        return [
            'total' => $tickets->count(),
            'active' => $tickets->where('status', 'active')->count(),
            'used' => $tickets->where('status', 'used')->count(),
            'cancelled' => $tickets->where('status', 'cancelled')->count(),
            'total_spent' => $tickets->sum('price'),
            'upcoming_events' => $tickets->where('status', 'active')
                ->whereHas('event', function($q) {
                    $q->where('start_date', '>', now());
                })->count()
        ];
    }

    /**
     * @OA\Get(
     *     path="/api/tickets/stats",
     *     summary="Get general ticket statistics for authenticated user",
     *     description="Retrieves comprehensive ticket statistics including recent tickets and upcoming events",
     *     operationId="getTicketStats",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Ticket statistics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Ticket statistics retrieved successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="stats", type="object",
     *                     @OA\Property(property="total", type="integer", example=45),
     *                     @OA\Property(property="active", type="integer", example=12),
     *                     @OA\Property(property="used", type="integer", example=30),
     *                     @OA\Property(property="cancelled", type="integer", example=3),
     *                     @OA\Property(property="total_spent", type="number", format="float", example=1250.75),
     *                     @OA\Property(property="upcoming_events", type="integer", example=5)
     *                 ),
     *                 @OA\Property(property="recent_tickets", type="array", @OA\Items(ref="#/components/schemas/TicketResource")),
     *                 @OA\Property(property="upcoming_events", type="array", @OA\Items(ref="#/components/schemas/TicketResource"))
     *             )
     *         )
     *     ),
     *     
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving ticket statistics"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getTicketStats(): JsonResponse
    {
        try {
            $userId = auth()->id();
            $stats = $this->getUserTicketStats($userId);
            
            // Add additional stats
            $recentTickets = Ticket::with('event')
                ->where('user_id', $userId)
                ->orderBy('purchase_date', 'desc')
                ->limit(5)
                ->get();

            $upcomingEvents = Ticket::with('event')
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->whereHas('event', function($q) {
                    $q->where('start_date', '>', now())
                      ->where('start_date', '<=', now()->addDays(30));
                })
                ->orderBy('purchase_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Ticket statistics retrieved successfully',
                'data' => [
                    'stats' => $stats,
                    'recent_tickets' => TicketResource::collection($recentTickets),
                    'upcoming_events' => TicketResource::collection($upcomingEvents)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ticket statistics',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/tickets/{id}",
     *     summary="Get a single ticket by ID",
     *     description="Retrieves detailed information about a specific ticket owned by the authenticated user",
     *     operationId="showTicket",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Ticket ID",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Ticket details retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/TicketResource")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Unauthorized access to ticket",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Unauthorized access to ticket")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ticket not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Ticket not found")
     *         )
     *     )
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
     * @OA\Get(
     *     path="/api/tickets/{id}/download",
     *     summary="Download ticket data",
     *     description="Retrieves ticket data formatted for download/printing purposes",
     *     operationId="downloadTicket",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Ticket ID",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Ticket data retrieved for download",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Ticket data retrieved for download"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                 @OA\Property(property="qr_code", type="string", example="550e8400-e29b-41d4-a716-446655440000"),
     *                 @OA\Property(property="event", type="object",
     *                     @OA\Property(property="name", type="string", example="Summer Music Festival"),
     *                     @OA\Property(property="start_date", type="string", format="date-time"),
     *                     @OA\Property(property="location", type="string", example="Central Park"),
     *                     @OA\Property(property="category", type="string", example="Music")
     *                 ),
     *                 @OA\Property(property="user", type="object",
     *                     @OA\Property(property="name", type="string", example="John Doe"),
     *                     @OA\Property(property="email", type="string", example="john@example.com")
     *                 ),
     *                 @OA\Property(property="price", type="number", format="float", example=75.50),
     *                 @OA\Property(property="status", type="string", example="active"),
     *                 @OA\Property(property="purchase_date", type="string", format="date-time")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ticket not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Ticket not found"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function downloadTicket($id): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event.category', 'user'])
                ->where('user_id', auth()->id())
                ->findOrFail($id);

            // Generate ticket data for download
            $ticketData = [
                'ticket_number' => $ticket->ticket_number,
                'qr_code' => $ticket->qr_code,
                'event' => [
                    'name' => $ticket->event->name,
                    'start_date' => $ticket->event->start_date,
                    'location' => $ticket->event->location,
                    'category' => $ticket->event->category->name,
                ],
                'user' => [
                    'name' => $ticket->user->name,
                    'email' => $ticket->user->email,
                ],
                'price' => $ticket->price,
                'status' => $ticket->status,
                'purchase_date' => $ticket->purchase_date,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Ticket data retrieved for download',
                'data' => $ticketData
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket not found',
                'data' => null
            ], 404);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/tickets/{id}/cancel",
     *     summary="Cancel a ticket with refund calculation",
     *     description="Cancels a user's ticket with intelligent refund calculation based on cancellation timing and policy. Includes comprehensive validation and refund processing.",
     *     operationId="cancelTicket",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Ticket ID",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Ticket cancelled successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Ticket cancelled successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="ticket", ref="#/components/schemas/TicketResource"),
     *                 @OA\Property(property="refund_info", type="object",
     *                     @OA\Property(property="original_price", type="number", format="float", example=100.00),
     *                     @OA\Property(property="cancellation_fee_percentage", type="number", format="float", example=10),
     *                     @OA\Property(property="cancellation_fee", type="number", format="float", example=10.00),
     *                     @OA\Property(property="refund_percentage", type="number", format="float", example=90),
     *                     @OA\Property(property="refund_amount", type="number", format="float", example=90.00),
     *                     @OA\Property(property="hours_until_event", type="integer", example=120),
     *                     @OA\Property(property="policy_applied", type="string", example="3-7 days before event: 10% cancellation fee")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Cannot cancel ticket",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Cannot cancel ticket for events that have already started"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="ticket", ref="#/components/schemas/TicketResource"),
     *                 @OA\Property(property="cancellation_info", type="object",
     *                     @OA\Property(property="can_cancel", type="boolean", example=false),
     *                     @OA\Property(property="reason", type="string", example="Cannot cancel ticket for events that have already started"),
     *                     @OA\Property(property="code", type="string", example="event_started")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ticket not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Ticket not found"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error cancelling ticket"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function cancel($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $ticket = Ticket::with(['event', 'user'])
                ->where('user_id', auth()->id())
                ->findOrFail($id);

            // Check if ticket can be cancelled
            $cancellationResult = $this->canCancelTicket($ticket);
            
            if (!$cancellationResult['can_cancel']) {
                return response()->json([
                    'success' => false,
                    'message' => $cancellationResult['reason'],
                    'data' => [
                        'ticket' => new TicketResource($ticket),
                        'cancellation_info' => $cancellationResult
                    ]
                ], 422);
            }

            // Calculate refund amount
            $refundInfo = $this->calculateRefund($ticket);

            // Mark ticket as cancelled
            $ticket->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'refund_amount' => $refundInfo['refund_amount'],
                'cancellation_fee' => $refundInfo['cancellation_fee']
            ]);

            // Return available tickets to the event
            $ticket->event->increment('available_tickets');

            // Log the cancellation
            \Log::info('Ticket cancelled', [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'user_id' => $ticket->user_id,
                'event_id' => $ticket->event_id,
                'refund_amount' => $refundInfo['refund_amount'],
                'cancellation_fee' => $refundInfo['cancellation_fee'],
                'cancelled_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Ticket cancelled successfully',
                'data' => [
                    'ticket' => new TicketResource($ticket),
                    'refund_info' => $refundInfo
                ]
            ]);

        } catch (ModelNotFoundException $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Ticket not found',
                'data' => null
            ], 404);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Error cancelling ticket',
                'data' => null
            ], 500);
        }
    }

    /**
     * Check if ticket can be cancelled
     */
    private function canCancelTicket(Ticket $ticket): array
    {
        $now = now();
        $event = $ticket->event;

        // Check if ticket is already cancelled
        if ($ticket->status === 'cancelled') {
            return [
                'can_cancel' => false,
                'reason' => 'Ticket is already cancelled',
                'code' => 'already_cancelled'
            ];
        }

        // Check if ticket is already used
        if ($ticket->status === 'used') {
            return [
                'can_cancel' => false,
                'reason' => 'Cannot cancel used ticket',
                'code' => 'already_used'
            ];
        }

        // Check if event has already started
        if ($event->start_date <= $now) {
            return [
                'can_cancel' => false,
                'reason' => 'Cannot cancel ticket for events that have already started',
                'code' => 'event_started'
            ];
        }

        // Check cancellation deadline (e.g., 24 hours before event)
        $cancellationDeadline = $event->start_date->copy()->subHours(24);
        if ($now > $cancellationDeadline) {
            return [
                'can_cancel' => false,
                'reason' => 'Cancellation deadline has passed (24 hours before event)',
                'code' => 'deadline_passed',
                'deadline' => $cancellationDeadline
            ];
        }

        // Check if event is too far in the future (optional business rule)
        $maxCancellationPeriod = $ticket->purchase_date->copy()->addDays(30);
        if ($now > $maxCancellationPeriod) {
            return [
                'can_cancel' => false,
                'reason' => 'Cancellation period has expired (30 days after purchase)',
                'code' => 'period_expired',
                'expiry_date' => $maxCancellationPeriod
            ];
        }

        return [
            'can_cancel' => true,
            'reason' => 'Ticket can be cancelled',
            'code' => 'can_cancel',
            'deadline' => $cancellationDeadline
        ];
    }

    /**
     * Calculate refund amount based on cancellation policy
     */
    private function calculateRefund(Ticket $ticket): array
    {
        $originalPrice = $ticket->price;
        $event = $ticket->event;
        $now = now();
        
        // Calculate hours until event
        $hoursUntilEvent = $now->diffInHours($event->start_date);
        
        // Cancellation fee structure
        $cancellationFeePercentage = 0;
        $refundPercentage = 100;
        
        if ($hoursUntilEvent >= 168) { // 7 days or more
            $cancellationFeePercentage = 5; // 5% fee
            $refundPercentage = 95;
        } elseif ($hoursUntilEvent >= 72) { // 3-7 days
            $cancellationFeePercentage = 10; // 10% fee
            $refundPercentage = 90;
        } elseif ($hoursUntilEvent >= 24) { // 1-3 days
            $cancellationFeePercentage = 20; // 20% fee
            $refundPercentage = 80;
        } else {
            // Less than 24 hours - no refund
            $cancellationFeePercentage = 100;
            $refundPercentage = 0;
        }
        
        $cancellationFee = $originalPrice * ($cancellationFeePercentage / 100);
        $refundAmount = $originalPrice * ($refundPercentage / 100);
        
        return [
            'original_price' => $originalPrice,
            'cancellation_fee_percentage' => $cancellationFeePercentage,
            'cancellation_fee' => $cancellationFee,
            'refund_percentage' => $refundPercentage,
            'refund_amount' => $refundAmount,
            'hours_until_event' => $hoursUntilEvent,
            'policy_applied' => $this->getCancellationPolicyText($hoursUntilEvent)
        ];
    }

    /**
     * Get cancellation policy text
     */
    private function getCancellationPolicyText(int $hoursUntilEvent): string
    {
        if ($hoursUntilEvent >= 168) {
            return '7+ days before event: 5% cancellation fee';
        } elseif ($hoursUntilEvent >= 72) {
            return '3-7 days before event: 10% cancellation fee';
        } elseif ($hoursUntilEvent >= 24) {
            return '1-3 days before event: 20% cancellation fee';
        } else {
            return 'Less than 24 hours: No refund';
        }
    }

    /**
     * @OA\Get(
     *     path="/api/events/{eventId}/cancellation-policy",
     *     summary="Get cancellation policy for an event",
     *     description="Retrieves the detailed cancellation policy including fee structure and general rules for a specific event",
     *     operationId="getCancellationPolicy",
     *     tags={"Tickets"},
     *     
     *     @OA\Parameter(
     *         name="eventId",
     *         in="path",
     *         required=true,
     *         description="Event ID",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Cancellation policy retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Cancellation policy retrieved successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="general_rules", type="array",
     *                     @OA\Items(type="string", example="Tickets can be cancelled up to 24 hours before the event")
     *                 ),
     *                 @OA\Property(property="fee_structure", type="array",
     *                     @OA\Items(type="object",
     *                         @OA\Property(property="period", type="string", example="7+ days before event"),
     *                         @OA\Property(property="fee_percentage", type="integer", example=5),
     *                         @OA\Property(property="refund_percentage", type="integer", example=95)
     *                     )
     *                 ),
     *                 @OA\Property(property="exceptions", type="array",
     *                     @OA\Items(type="string", example="Event cancellation: Full refund")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Event not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Event not found"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getCancellationPolicy($eventId): JsonResponse
    {
        try {
            $event = Event::findOrFail($eventId);
            
            $policy = [
                'general_rules' => [
                    'Tickets can be cancelled up to 24 hours before the event',
                    'Cancellation fees apply based on timing',
                    'Refunds are processed within 5-7 business days'
                ],
                'fee_structure' => [
                    [
                        'period' => '7+ days before event',
                        'fee_percentage' => 5,
                        'refund_percentage' => 95
                    ],
                    [
                        'period' => '3-7 days before event',
                        'fee_percentage' => 10,
                        'refund_percentage' => 90
                    ],
                    [
                        'period' => '1-3 days before event',
                        'fee_percentage' => 20,
                        'refund_percentage' => 80
                    ],
                    [
                        'period' => 'Less than 24 hours',
                        'fee_percentage' => 100,
                        'refund_percentage' => 0
                    ]
                ],
                'exceptions' => [
                    'Event cancellation: Full refund',
                    'Event postponement: Free transfer or full refund',
                    'Force majeure: Case by case basis'
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Cancellation policy retrieved successfully',
                'data' => $policy
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found',
                'data' => null
            ], 404);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/tickets/validate/{ticketNumber}",
     *     summary="Validate a ticket by ticket number",
     *     description="Validates a ticket using its ticket number and returns detailed validation status",
     *     operationId="validateTicket",
     *     tags={"Tickets"},
     *     
     *     @OA\Parameter(
     *         name="ticketNumber",
     *         in="path",
     *         required=true,
     *         description="Ticket number (e.g., TKT-ABC12345)",
     *         @OA\Schema(type="string", example="TKT-ABC12345")
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Ticket validation completed",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Valid ticket"),
     *             @OA\Property(property="valid", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/TicketResource"),
     *             @OA\Property(property="validation_details", type="object",
     *                 @OA\Property(property="ticket_status", type="string", example="active"),
     *                 @OA\Property(property="event_status", type="string", example="active"),
     *                 @OA\Property(property="validation_time", type="string", format="date-time"),
     *                 @OA\Property(property="reason", type="string", example="valid")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Invalid ticket number",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Invalid ticket number"),
     *             @OA\Property(property="valid", type="boolean", example=false),
     *             @OA\Property(property="data", type="null")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error validating ticket"),
     *             @OA\Property(property="valid", type="boolean", example=false),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
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
     *     description="Validates multiple tickets at once for efficient entry processing. Limited to 50 tickets per request.",
     *     operationId="validateBulk",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"ticket_numbers"},
     *             @OA\Property(
     *                 property="ticket_numbers",
     *                 type="array",
     *                 maxItems=50,
     *                 description="Array of ticket numbers to validate",
     *                 @OA\Items(type="string", example="TKT-ABC12345")
     *             )
     *         )
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Bulk validation completed",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Bulk validation completed"),
     *             @OA\Property(property="data", type="array",
     *                 @OA\Items(type="object",
     *                     @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                     @OA\Property(property="valid", type="boolean", example=true),
     *                     @OA\Property(property="message", type="string", example="Valid ticket"),
     *                     @OA\Property(property="ticket", ref="#/components/schemas/TicketResource")
     *                 )
     *             ),
     *             @OA\Property(property="summary", type="object",
     *                 @OA\Property(property="total", type="integer", example=10),
     *                 @OA\Property(property="valid", type="integer", example=8),
     *                 @OA\Property(property="invalid", type="integer", example=2)
     *             )
     *         )
     *     ),
     *     
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="The ticket numbers field is required."),
     *             @OA\Property(property="errors", type="object")
     *         )
     *     )
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
     *     description="Marks a ticket as used when a person enters an event. Validates the ticket before marking as used.",
     *     operationId="markAsUsed",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Ticket ID",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Ticket marked as used successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Ticket marked as used successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/TicketResource")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ticket not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Ticket not found"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Ticket not valid for use",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Ticket has already been used"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="used_at", type="string", format="date-time"),
     *                 @OA\Property(property="ticket", ref="#/components/schemas/TicketResource")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error marking ticket as used"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
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
     *     description="Retrieves comprehensive validation and usage statistics for a specific event",
     *     operationId="getValidationStats",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *     
     *     @OA\Parameter(
     *         name="eventId",
     *         in="path",
     *         required=true,
     *         description="Event ID",
     *         @OA\Schema(type="integer", example=1)
     *     ),
     *     
     *     @OA\Response(
     *         response=200,
     *         description="Validation statistics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Validation statistics retrieved successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="total_tickets", type="integer", example=150),
     *                 @OA\Property(property="active_tickets", type="integer", example=120),
     *                 @OA\Property(property="used_tickets", type="integer", example=85),
     *                 @OA\Property(property="cancelled_tickets", type="integer", example=30),
     *                 @OA\Property(property="validation_rate", type="number", format="float", example=56.67),
     *                 @OA\Property(property="recent_validations", type="array",
     *                     @OA\Items(type="object",
     *                         @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                         @OA\Property(property="user_name", type="string", example="John Doe"),
     *                         @OA\Property(property="used_at", type="string", format="date-time"),
     *                         @OA\Property(property="time_ago", type="string", example="5 minutes ago")
     *                     )
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Event not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Event not found"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
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