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
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/tickets/purchase",
     *     summary="Purchase a ticket for an event",
     *     description="Purchases a ticket for a specific event with QR code generation. Requires the event to be valid and have available tickets. Optionally applies a discount percentage.",
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


            if (!$event->canPurchaseTickets()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot purchase tickets for this event'
                ], 422);
            }


            if (!$event->hasAvailableTickets()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tickets available for this event'
                ], 422);
            }


            $discountPercentage = $request->discount_percentage ?? 0;
            $finalPrice = $event->price * (1 - $discountPercentage / 100);


            $ticketNumber = $this->generateTicketNumber();
            $qrCodeData = $this->generateQRCodeData($ticketNumber, $event, auth()->user());


            $ticket = Ticket::create([
                'ticket_number' => $ticketNumber,
                'qr_code' => $qrCodeData['qr_string'],
                'qr_code_path' => $qrCodeData['qr_path'],
                'price' => $finalPrice,
                'discount_percentage' => $discountPercentage,
                'status' => 'active',
                'purchase_date' => now(),
                'event_id' => $request->event_id,
                'user_id' => auth()->id()
            ]);


            $event->decrement('available_tickets');
            $ticket->load(['event.category', 'user']);


            // Send email notification
            try {
                Mail::to($ticket->user->email)->send(
                    new TicketPurchaseConfirmation($ticket, $qrCodeData['qr_path'])
                );
            } catch (\Exception $e) {
                \Log::error('Failed to send purchase confirmation email', [
                    'ticket_id' => $ticket->id,
                    'error' => $e->getMessage()
                ]);
                // Don't fail the purchase if email fails
            }


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
     * Generate QR code data and image
     */
    private function generateQRCodeData(string $ticketNumber, Event $event, $user): array
    {
        // Create QR code data structure
        $qrData = [
            'ticket_number' => $ticketNumber,
            'event_id' => $event->id,
            'event_name' => $event->name,
            'event_date' => $event->start_date->toISOString(),
            'location' => $event->location,
            'user_id' => $user->id,
            'user_name' => $user->name,
            'generated_at' => now()->toISOString(),
            'validation_url' => url("/api/tickets/validate/{$ticketNumber}")
        ];

        // Convert to JSON string
        $qrString = json_encode($qrData);

        // Generate QR code image
        $qrCodeImage = QrCode::format('png')
            ->size(300)
            ->margin(2)
            ->errorCorrection('M')
            ->generate($qrString);

        // Save QR code image to storage
        $fileName = "qr-codes/{$ticketNumber}.png";
        Storage::disk('public')->put($fileName, $qrCodeImage);

        return [
            'qr_string' => $qrString,
            'qr_path' => $fileName,
            'qr_url' => Storage::disk('public')->url($fileName)
        ];
    }

    /**
     * @OA\Get(
     *     path="/api/tickets/{id}/qr-code",
     *     summary="Get QR code for a ticket",
     *     description="Retrieves the QR code image and data for a specific ticket owned by the authenticated user",
     *     operationId="getQRCode",
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
     *         description="QR code retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="QR code retrieved successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="qr_code_url", type="string", example="https://example.com/storage/qr-codes/TKT-ABC12345.png"),
     *                 @OA\Property(property="qr_code_data", type="object",
     *                     @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                     @OA\Property(property="event_id", type="integer", example=1),
     *                     @OA\Property(property="event_name", type="string", example="Summer Music Festival"),
     *                     @OA\Property(property="event_date", type="string", format="date-time"),
     *                     @OA\Property(property="location", type="string", example="Central Park"),
     *                     @OA\Property(property="user_id", type="integer", example=1),
     *                     @OA\Property(property="user_name", type="string", example="John Doe"),
     *                     @OA\Property(property="generated_at", type="string", format="date-time"),
     *                     @OA\Property(property="validation_url", type="string", example="https://example.com/api/tickets/validate/TKT-ABC12345")
     *                 ),
     *                 @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345")
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
    public function getQRCode($id): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event', 'user'])
                ->where('user_id', auth()->id())
                ->findOrFail($id);

            if (!$ticket->qr_code_path || !Storage::disk('public')->exists($ticket->qr_code_path)) {
                // Regenerate QR code if missing
                $qrCodeData = $this->generateQRCodeData(
                    $ticket->ticket_number, 
                    $ticket->event, 
                    $ticket->user
                );
                
                $ticket->update([
                    'qr_code' => $qrCodeData['qr_string'],
                    'qr_code_path' => $qrCodeData['qr_path']
                ]);
            }

            $qrCodeUrl = Storage::disk('public')->url($ticket->qr_code_path);

            return response()->json([
                'success' => true,
                'message' => 'QR code retrieved successfully',
                'data' => [
                    'qr_code_url' => $qrCodeUrl,
                    'qr_code_data' => json_decode($ticket->qr_code, true),
                    'ticket_number' => $ticket->ticket_number
                ]
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
     * @OA\Post(
     *     path="/api/tickets/validate/qr-code",
     *     summary="Validate a ticket using QR code data",
     *     description="Validates a ticket by scanning and decoding QR code data. Verifies data integrity and ticket status.",
     *     operationId="validateQRCode",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *    
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"qr_data"},
     *             @OA\Property(property="qr_data", type="string", description="JSON string from QR code scan", example="{\"ticket_number\":\"TKT-ABC12345\",\"event_id\":1,\"event_name\":\"Summer Music Festival\"}")
     *         )
     *     ),
     *    
     *     @OA\Response(
     *         response=200,
     *         description="QR code validation completed",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Valid ticket"),
     *             @OA\Property(property="valid", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/TicketResource"),
     *             @OA\Property(property="qr_data", type="object",
     *                 @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                 @OA\Property(property="event_id", type="integer", example=1),
     *                 @OA\Property(property="event_name", type="string", example="Summer Music Festival")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid QR code format or data mismatch",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Invalid QR code format"),
     *             @OA\Property(property="valid", type="boolean", example=false)
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ticket not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Ticket not found"),
     *             @OA\Property(property="valid", type="boolean", example=false)
     *         )
     *     )
     * )
     */
    public function validateQRCode(Request $request): JsonResponse
    {
        $request->validate([
            'qr_data' => 'required|string'
        ]);

        try {
            $qrData = json_decode($request->qr_data, true);
            
            if (!$qrData || !isset($qrData['ticket_number'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid QR code format',
                    'valid' => false
                ], 400);
            }

            $ticket = Ticket::with(['event.category', 'user'])
                ->where('ticket_number', $qrData['ticket_number'])
                ->first();

            if (!$ticket) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ticket not found',
                    'valid' => false
                ], 404);
            }

            // Verify QR code data integrity
            $storedQrData = json_decode($ticket->qr_code, true);
            if ($storedQrData['ticket_number'] !== $qrData['ticket_number'] ||
                $storedQrData['event_id'] !== $qrData['event_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR code data mismatch',
                    'valid' => false
                ], 400);
            }

            // Validate ticket status
            $validationResult = $this->validateTicketStatus($ticket);

            return response()->json([
                'success' => true,
                'message' => $validationResult['message'],
                'valid' => $validationResult['valid'],
                'data' => $validationResult['valid'] ? new TicketResource($ticket) : null,
                'qr_data' => $qrData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error validating QR code',
                'valid' => false
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/tickets/{id}/pdf",
     *     summary="Generate ticket PDF data",
     *     description="Retrieves ticket data formatted for PDF generation including QR code URL and all necessary ticket information",
     *     operationId="generateTicketPDF",
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
     *         description="Ticket data for PDF generation retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Ticket data for PDF generation"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                 @OA\Property(property="qr_code_url", type="string", example="https://example.com/storage/qr-codes/TKT-ABC12345.png"),
     *                 @OA\Property(property="event", type="object",
     *                     @OA\Property(property="name", type="string", example="Summer Music Festival"),
     *                     @OA\Property(property="date", type="string", example="15.08.2024"),
     *                     @OA\Property(property="time", type="string", example="19:00"),
     *                     @OA\Property(property="location", type="string", example="Central Park"),
     *                     @OA\Property(property="category", type="string", example="Music")
     *                 ),
     *                 @OA\Property(property="user", type="object",
     *                     @OA\Property(property="name", type="string", example="John Doe"),
     *                     @OA\Property(property="email", type="string", example="john@example.com")
     *                 ),
     *                 @OA\Property(property="price", type="number", format="float", example=75.50),
     *                 @OA\Property(property="purchase_date", type="string", example="10.08.2024 14:30"),
     *                 @OA\Property(property="status", type="string", example="active")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Ticket not found",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Ticket not found")
     *         )
     *     )
     * )
     */
    public function generateTicketPDF($id): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event.category', 'user'])
                ->where('user_id', auth()->id())
                ->findOrFail($id);

            // Ensure QR code exists
            if (!$ticket->qr_code_path || !Storage::disk('public')->exists($ticket->qr_code_path)) {
                $qrCodeData = $this->generateQRCodeData(
                    $ticket->ticket_number, 
                    $ticket->event, 
                    $ticket->user
                );
                
                $ticket->update([
                    'qr_code' => $qrCodeData['qr_string'],
                    'qr_code_path' => $qrCodeData['qr_path']
                ]);
            }

            $ticketData = [
                'ticket_number' => $ticket->ticket_number,
                'qr_code_url' => Storage::disk('public')->url($ticket->qr_code_path),
                'event' => [
                    'name' => $ticket->event->name,
                    'date' => $ticket->event->start_date->format('d.m.Y'),
                    'time' => $ticket->event->start_date->format('H:i'),
                    'location' => $ticket->event->location,
                    'category' => $ticket->event->category->name
                ],
                'user' => [
                    'name' => $ticket->user->name,
                    'email' => $ticket->user->email
                ],
                'price' => $ticket->price,
                'purchase_date' => $ticket->purchase_date->format('d.m.Y H:i'),
                'status' => $ticket->status
            ];

            return response()->json([
                'success' => true,
                'message' => 'Ticket data for PDF generation',
                'data' => $ticketData
            ]);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket not found'
            ], 404);
        }
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
     *     @OA\Parameter(
     *         name="date_from",
     *         in="query",
     *         description="Filter by purchase date from",
     *         required=false,
     *         @OA\Schema(type="string", format="date", example="2024-01-01")
     *     ),
     *     @OA\Parameter(
     *         name="date_to",
     *         in="query",
     *         description="Filter by purchase date to",
     *         required=false,
     *         @OA\Schema(type="string", format="date", example="2024-12-31")
     *     ),
     *     @OA\Parameter(
     *         name="category_id",
     *         in="query",
     *         description="Filter by event category",
     *         required=false,
     *         @OA\Schema(type="integer", example=1)
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
     *                     @OA\Property(property="total", type="integer", example=45),
     *                     @OA\Property(property="from", type="integer", example=1),
     *                     @OA\Property(property="to", type="integer", example=10)
     *                 ),
     *                 @OA\Property(property="stats", type="object",
     *                     @OA\Property(property="total", type="integer", example=45),
     *                     @OA\Property(property="active", type="integer", example=12),
     *                     @OA\Property(property="used", type="integer", example=30),
     *                     @OA\Property(property="cancelled", type="integer", example=3),
     *                     @OA\Property(property="total_spent", type="number", format="float", example=1250.75),
     *                     @OA\Property(property="upcoming_events", type="integer", example=5),
     *                     @OA\Property(property="monthly_spending", type="array",
     *                         @OA\Items(type="object",
     *                             @OA\Property(property="month", type="string", example="2024-01"),
     *                             @OA\Property(property="amount", type="number", format="float", example=150.00),
     *                             @OA\Property(property="tickets_count", type="integer", example=3)
     *                         )
     *                     )
     *                 ),
     *                 @OA\Property(property="filters", type="object",
     *                     @OA\Property(property="applied", type="object",
     *                         @OA\Property(property="status", type="string", example="active"),
     *                         @OA\Property(property="search", type="string", example="music"),
     *                         @OA\Property(property="date_from", type="string", example="2024-01-01"),
     *                         @OA\Property(property="date_to", type="string", example="2024-12-31"),
     *                         @OA\Property(property="category_id", type="integer", example=1)
     *                     ),
     *                     @OA\Property(property="available_categories", type="array",
     *                         @OA\Items(type="object",
     *                             @OA\Property(property="id", type="integer", example=1),
     *                             @OA\Property(property="name", type="string", example="Music"),
     *                             @OA\Property(property="tickets_count", type="integer", example=15)
     *                         )
     *                     )
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

            // Date range filter
            if ($request->has('date_from') && $request->date_from) {
                $query->whereDate('purchase_date', '>=', $request->date_from);
            }

            if ($request->has('date_to') && $request->date_to) {
                $query->whereDate('purchase_date', '<=', $request->date_to);
            }

            // Category filter
            if ($request->has('category_id') && $request->category_id) {
                $query->whereHas('event', function($q) use ($request) {
                    $q->where('category_id', $request->category_id);
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

            // Get available categories for filtering
            $availableCategories = $this->getAvailableCategories(auth()->id());

            // Applied filters for frontend
            $appliedFilters = [
                'status' => $request->get('status', 'all'),
                'search' => $request->get('search'),
                'date_from' => $request->get('date_from'),
                'date_to' => $request->get('date_to'),
                'category_id' => $request->get('category_id'),
                'sortBy' => $sortBy,
                'sortOrder' => $sortOrder
            ];

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
                        'from' => $tickets->firstItem(),
                        'to' => $tickets->lastItem(),
                    ],
                    'stats' => $stats,
                    'filters' => [
                        'applied' => $appliedFilters,
                        'available_categories' => $availableCategories
                    ]
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
     * Enhanced method for user ticket statistics with monthly spending
     */
    private function getUserTicketStats($userId): array
    {
        $tickets = Ticket::where('user_id', $userId);
        
        // Monthly spending for the last 12 months
        $monthlySpending = Ticket::where('user_id', $userId)
            ->selectRaw('DATE_FORMAT(purchase_date, "%Y-%m") as month')
            ->selectRaw('SUM(price) as amount')
            ->selectRaw('COUNT(*) as tickets_count')
            ->where('purchase_date', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'month' => $item->month,
                    'amount' => (float) $item->amount,
                    'tickets_count' => $item->tickets_count
                ];
            });

        return [
            'total' => $tickets->count(),
            'active' => $tickets->where('status', 'active')->count(),
            'used' => $tickets->where('status', 'used')->count(),
            'cancelled' => $tickets->where('status', 'cancelled')->count(),
            'total_spent' => $tickets->sum('price'),
            'upcoming_events' => $tickets->where('status', 'active')
                ->whereHas('event', function($q) {
                    $q->where('start_date', '>', now());
                })->count(),
            'monthly_spending' => $monthlySpending
        ];
    }

    /**
     * Get available categories for user's tickets
     */
    private function getAvailableCategories($userId): array
    {
        return DB::table('tickets')
            ->join('events', 'tickets.event_id', '=', 'events.id')
            ->join('categories', 'events.category_id', '=', 'categories.id')
            ->where('tickets.user_id', $userId)
            ->select('categories.id', 'categories.name')
            ->selectRaw('COUNT(tickets.id) as tickets_count')
            ->groupBy('categories.id', 'categories.name')
            ->orderBy('categories.name')
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'tickets_count' => $item->tickets_count
                ];
            })
            ->toArray();
    }

      /**
     * @OA\Get(
     *     path="/api/tickets/{id}/receipt",
     *     summary="Generate receipt for a ticket purchase",
     *     description="Generates a detailed receipt for a specific ticket purchase including all transaction details",
     *     operationId="generateReceipt",
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
     *         description="Receipt generated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Receipt generated successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="receipt_number", type="string", example="RCP-ABC12345"),
     *                 @OA\Property(property="issue_date", type="string", format="date-time"),
     *                 @OA\Property(property="ticket", type="object",
     *                     @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
     *                     @OA\Property(property="price", type="number", format="float", example=90.00),
     *                     @OA\Property(property="original_price", type="number", format="float", example=100.00),
     *                     @OA\Property(property="discount_percentage", type="number", format="float", example=10),
     *                     @OA\Property(property="discount_amount", type="number", format="float", example=10.00),
     *                     @OA\Property(property="status", type="string", example="active"),
     *                     @OA\Property(property="purchase_date", type="string", format="date-time")
     *                 ),
     *                 @OA\Property(property="event", type="object",
     *                     @OA\Property(property="name", type="string", example="Summer Music Festival"),
     *                     @OA\Property(property="start_date", type="string", format="date-time"),
     *                     @OA\Property(property="location", type="string", example="Central Park"),
     *                     @OA\Property(property="category", type="string", example="Music")
     *                 ),
     *                 @OA\Property(property="customer", type="object",
     *                     @OA\Property(property="name", type="string", example="John Doe"),
     *                     @OA\Property(property="email", type="string", example="john@example.com")
     *                 ),
     *                 @OA\Property(property="company", type="object",
     *                     @OA\Property(property="name", type="string", example="TicketMaster Pro"),
     *                     @OA\Property(property="address", type="string", example="Knez Mihailova 42, Beograd"),
     *                     @OA\Property(property="tax_number", type="string", example="123456789"),
     *                     @OA\Property(property="phone", type="string", example="+381 11 123 4567")
     *                 ),
     *                 @OA\Property(property="payment_details", type="object",
     *                     @OA\Property(property="subtotal", type="number", format="float", example=100.00),
     *                     @OA\Property(property="discount", type="number", format="float", example=10.00),
     *                     @OA\Property(property="tax_rate", type="number", format="float", example=20),
     *                     @OA\Property(property="tax_amount", type="number", format="float", example=18.00),
     *                     @OA\Property(property="total", type="number", format="float", example=90.00)
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
     *     )
     * )
     */
    public function generateReceipt($id): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event.category', 'user'])
                ->where('user_id', auth()->id())
                ->findOrFail($id);

            // Calculate payment details
            $originalPrice = $ticket->event->price;
            $discountAmount = $originalPrice * ($ticket->discount_percentage / 100);
            $subtotal = $originalPrice - $discountAmount;
            $taxRate = 20; // 20% PDV
            $taxAmount = $subtotal * ($taxRate / 100);
            $total = $ticket->price;

            $receiptData = [
                'receipt_number' => 'RCP-' . strtoupper(Str::random(8)),
                'issue_date' => now()->toISOString(),
                'ticket' => [
                    'ticket_number' => $ticket->ticket_number,
                    'price' => $ticket->price,
                    'original_price' => $originalPrice,
                    'discount_percentage' => $ticket->discount_percentage,
                    'discount_amount' => $discountAmount,
                    'status' => $ticket->status,
                    'purchase_date' => $ticket->purchase_date,
                ],
                'event' => [
                    'name' => $ticket->event->name,
                    'start_date' => $ticket->event->start_date,
                    'location' => $ticket->event->location,
                    'category' => $ticket->event->category->name,
                ],
                'customer' => [
                    'name' => $ticket->user->name,
                    'email' => $ticket->user->email,
                ],
                'company' => [
                    'name' => 'TicketMaster Pro',
                    'address' => 'Knez Mihailova 42, Beograd',
                    'tax_number' => '123456789',
                    'phone' => '+381 11 123 4567',
                ],
                'payment_details' => [
                    'subtotal' => $originalPrice,
                    'discount' => $discountAmount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'total' => $total
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Receipt generated successfully',
                'data' => $receiptData
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
     * @OA\Get(
     *     path="/api/tickets/purchase-history/export",
     *     summary="Export purchase history",
     *     description="Exports user's purchase history in various formats (CSV, PDF, Excel)",
     *     operationId="exportPurchaseHistory",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *    
     *     @OA\Parameter(
     *         name="format",
     *         in="query",
     *         description="Export format",
     *         required=false,
     *         @OA\Schema(type="string", enum={"csv", "pdf", "excel"}, default="csv")
     *     ),
     *     @OA\Parameter(
     *         name="date_from",
     *         in="query",
     *         description="Export from date",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *     @OA\Parameter(
     *         name="date_to",
     *         in="query",
     *         description="Export to date",
     *         required=false,
     *         @OA\Schema(type="string", format="date")
     *     ),
     *    
     *     @OA\Response(
     *         response=200,
     *         description="Export data prepared successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Export data prepared successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="export_url", type="string", example="https://example.com/exports/purchase-history-123.csv"),
     *                 @OA\Property(property="filename", type="string", example="purchase-history-2024-01-15.csv"),
     *                 @OA\Property(property="format", type="string", example="csv"),
     *                 @OA\Property(property="total_records", type="integer", example=45),
     *                 @OA\Property(property="date_range", type="object",
     *                     @OA\Property(property="from", type="string", example="2024-01-01"),
     *                     @OA\Property(property="to", type="string", example="2024-12-31")
     *                 )
     *             )
     *         )
     *     )
     * )
     */
    public function exportPurchaseHistory(Request $request): JsonResponse
    {
        try {
            $format = $request->get('format', 'csv');
            $dateFrom = $request->get('date_from');
            $dateTo = $request->get('date_to');

            $query = Ticket::with(['event.category'])
                ->where('user_id', auth()->id());

            if ($dateFrom) {
                $query->whereDate('purchase_date', '>=', $dateFrom);
            }

            if ($dateTo) {
                $query->whereDate('purchase_date', '<=', $dateTo);
            }

            $tickets = $query->orderBy('purchase_date', 'desc')->get();

            // Prepare export data
            $exportData = $tickets->map(function($ticket) {
                return [
                    'Ticket Number' => $ticket->ticket_number,
                    'Event Name' => $ticket->event->name,
                    'Event Date' => $ticket->event->start_date->format('Y-m-d H:i'),
                    'Location' => $ticket->event->location,
                    'Category' => $ticket->event->category->name,
                    'Price' => $ticket->price,
                    'Discount %' => $ticket->discount_percentage,
                    'Status' => ucfirst($ticket->status),
                    'Purchase Date' => $ticket->purchase_date->format('Y-m-d H:i'),
                ];
            });

            // Generate filename
            $dateRange = '';
            if ($dateFrom && $dateTo) {
                $dateRange = "-{$dateFrom}-to-{$dateTo}";
            } elseif ($dateFrom) {
                $dateRange = "-from-{$dateFrom}";
            } elseif ($dateTo) {
                $dateRange = "-until-{$dateTo}";
            }

            $filename = "purchase-history{$dateRange}-" . now()->format('Y-m-d') . ".{$format}";

            // In a real implementation, you would generate the actual file here
            // For now, we'll return the data structure that the frontend can use
            
            return response()->json([
                'success' => true,
                'message' => 'Export data prepared successfully',
                'data' => [
                    'export_data' => $exportData,
                    'filename' => $filename,
                    'format' => $format,
                    'total_records' => $tickets->count(),
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => $dateTo
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error preparing export data',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/tickets/purchase-summary",
     *     summary="Get purchase summary analytics",
     *     description="Retrieves comprehensive analytics about user's ticket purchases including spending patterns and trends",
     *     operationId="getPurchaseSummary",
     *     tags={"Tickets"},
     *     security={{"sanctum":{}}},
     *    
     *     @OA\Parameter(
     *         name="period",
     *         in="query",
     *         description="Analysis period",
     *         required=false,
     *         @OA\Schema(type="string", enum={"last_month", "last_3_months", "last_6_months", "last_year", "all_time"}, default="last_year")
     *     ),
     *    
     *     @OA\Response(
     *         response=200,
     *         description="Purchase summary retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Purchase summary retrieved successfully"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="overview", type="object",
     *                     @OA\Property(property="total_spent", type="number", format="float", example=1250.75),
     *                     @OA\Property(property="total_tickets", type="integer", example=45),
     *                     @OA\Property(property="average_ticket_price", type="number", format="float", example=27.79),
     *                     @OA\Property(property="total_savings", type="number", format="float", example=125.50),
     *                     @OA\Property(property="favorite_category", type="string", example="Music")
     *                 ),
     *                 @OA\Property(property="monthly_breakdown", type="array",
     *                     @OA\Items(type="object",
     *                         @OA\Property(property="month", type="string", example="2024-01"),
     *                         @OA\Property(property="spent", type="number", format="float", example=150.00),
     *                         @OA\Property(property="tickets", type="integer", example=3),
     *                         @OA\Property(property="events_attended", type="integer", example=2)
     *                     )
     *                 ),
     *                 @OA\Property(property="category_breakdown", type="array",
     *                     @OA\Items(type="object",
     *                         @OA\Property(property="category", type="string", example="Music"),
     *                         @OA\Property(property="tickets", type="integer", example=15),
     *                         @OA\Property(property="spent", type="number", format="float", example=450.00),
     *                         @OA\Property(property="percentage", type="number", format="float", example=36.0)
     *                     )
     *                 ),
     *                 @OA\Property(property="trends", type="object",
     *                     @OA\Property(property="spending_trend", type="string", example="increasing"),
     *                     @OA\Property(property="most_active_month", type="string", example="December"),
     *                     @OA\Property(property="preferred_price_range", type="string", example="20-50 EUR")
     *                 )
     *             )
     *         )
     *     )
     * )
     */
    public function getPurchaseSummary(Request $request): JsonResponse
    {
        try {
            $period = $request->get('period', 'last_year');
            $userId = auth()->id();

            // Define date range based on period
            $dateFrom = match($period) {
                'last_month' => now()->subMonth(),
                'last_3_months' => now()->subMonths(3),
                'last_6_months' => now()->subMonths(6),
                'last_year' => now()->subYear(),
                default => null
            };

            $query = Ticket::with(['event.category'])
                ->where('user_id', $userId);

            if ($dateFrom) {
                $query->where('purchase_date', '>=', $dateFrom);
            }

            $tickets = $query->get();

            // Overview calculations
            $totalSpent = $tickets->sum('price');
            $totalTickets = $tickets->count();
            $averageTicketPrice = $totalTickets > 0 ? $totalSpent / $totalTickets : 0;
            
            // Calculate total savings (original price - paid price)
            $totalSavings = $tickets->sum(function($ticket) {
                $originalPrice = $ticket->event->price;
                return $originalPrice - $ticket->price;
            });

            // Favorite category
            $favoriteCategory = $tickets->groupBy('event.category.name')
                ->map(function($categoryTickets) {
                    return $categoryTickets->count();
                })
                ->sortDesc()
                ->keys()
                ->first() ?? 'N/A';

            // Monthly breakdown
            $monthlyBreakdown = $tickets->groupBy(function($ticket) {
                return $ticket->purchase_date->format('Y-m');
            })->map(function($monthTickets, $month) {
                return [
                    'month' => $month,
                    'spent' => $monthTickets->sum('price'),
                    'tickets' => $monthTickets->count(),
                    'events_attended' => $monthTickets->where('status', 'used')->count()
                ];
            })->values();

            // Category breakdown
            $categoryBreakdown = $tickets->groupBy('event.category.name')
                ->map(function($categoryTickets, $category) use ($totalSpent) {
                    $categorySpent = $categoryTickets->sum('price');
                    return [
                        'category' => $category,
                        'tickets' => $categoryTickets->count(),
                        'spent' => $categorySpent,
                        'percentage' => $totalSpent > 0 ? ($categorySpent / $totalSpent) * 100 : 0
                    ];
                })->values();

            // Trends analysis
            $spendingTrend = $this->calculateSpendingTrend($monthlyBreakdown);
            $mostActiveMonth = $monthlyBreakdown->sortByDesc('tickets')->first()['month'] ?? 'N/A';
            $preferredPriceRange = $this->calculatePreferredPriceRange($tickets);

            return response()->json([
                'success' => true,
                'message' => 'Purchase summary retrieved successfully',
                'data' => [
                    'overview' => [
                        'total_spent' => round($totalSpent, 2),
                        'total_tickets' => $totalTickets,
                        'average_ticket_price' => round($averageTicketPrice, 2),
                        'total_savings' => round($totalSavings, 2),
                        'favorite_category' => $favoriteCategory
                    ],
                    'monthly_breakdown' => $monthlyBreakdown,
                    'category_breakdown' => $categoryBreakdown,
                    'trends' => [
                        'spending_trend' => $spendingTrend,
                        'most_active_month' => $mostActiveMonth,
                        'preferred_price_range' => $preferredPriceRange
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving purchase summary',
                'data' => null
            ], 500);
        }
    }

    /**
     * Calculate spending trend
     */
    private function calculateSpendingTrend($monthlyBreakdown): string
    {
        if ($monthlyBreakdown->count() < 2) {
            return 'insufficient_data';
        }

        $recent = $monthlyBreakdown->take(3)->avg('spent');
        $older = $monthlyBreakdown->skip(3)->take(3)->avg('spent');

        if ($recent > $older * 1.1) {
            return 'increasing';
        } elseif ($recent < $older * 0.9) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    /**
     * Calculate preferred price range
     */
    private function calculatePreferredPriceRange($tickets): string
    {
        if ($tickets->isEmpty()) {
            return 'N/A';
        }

        $prices = $tickets->pluck('price')->sort();
        $count = $prices->count();
        
        // Find the range where most tickets fall
        $ranges = [
            '0-20' => $prices->filter(fn($p) => $p <= 20)->count(),
            '20-50' => $prices->filter(fn($p) => $p > 20 && $p <= 50)->count(),
            '50-100' => $prices->filter(fn($p) => $p > 50 && $p <= 100)->count(),
            '100+' => $prices->filter(fn($p) => $p > 100)->count(),
        ];

        $preferredRange = collect($ranges)->sortDesc()->keys()->first();
        
        return $preferredRange . ' EUR';
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


        $refundInfo = $this->calculateRefund($ticket);


        $ticket->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'refund_amount' => $refundInfo['refund_amount'],
            'cancellation_fee' => $refundInfo['cancellation_fee']
        ]);


        $ticket->event->increment('available_tickets');


        // Send cancellation email
        try {
            Mail::to($ticket->user->email)->send(
                new TicketCancellationConfirmation($ticket, $refundInfo)
            );
        } catch (\Exception $e) {
            \Log::error('Failed to send cancellation confirmation email', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage()
            ]);
        }


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