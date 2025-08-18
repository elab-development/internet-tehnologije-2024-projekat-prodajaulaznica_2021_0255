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
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use SimpleSoftwareIO\QrCode\Generators\GDGenerator;
// use App\Mail\TicketPurchaseConfirmation;
// use App\Mail\TicketCancellationConfirmation;

class TicketController extends Controller
{
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
            'qr_code' => $qrCodeData['qr_string'],     // JSON string
            'qr_code_svg' => $qrCodeData['qr_svg'],    // SVG string
            'price' => $finalPrice,
            'discount_percentage' => $discountPercentage,
            'status' => 'active',
            'purchase_date' => now(),
            'event_id' => $request->event_id,
            'user_id' => auth()->id()
        ]);

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
        
        Log::error('Error purchasing ticket', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
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
     * Generate QR code data and image using GD
     */
     private function generateQRCodeData(string $ticketNumber, Event $event, $user): array
{
    try {
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

        // GENERIŠI SVG QR KOD
        $qrCodeSvg = QrCode::size(300)
            ->format('svg')
            ->generate($qrString);

        return [
            'qr_string' => $qrString,    // JSON za validaciju
            'qr_svg' => $qrCodeSvg       // SVG za prikaz
        ];

    } catch (\Exception $e) {
        Log::error('Error generating QR code data', [
            'ticket_number' => $ticketNumber,
            'error' => $e->getMessage(),
        ]);
        
        throw new \Exception('Failed to generate QR code data: ' . $e->getMessage());
    }
}

   // U TicketController.php

public function getQRCode($id): JsonResponse
{
    try {
        $ticket = Ticket::with(['event', 'user'])
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        // Proveri da li SVG postoji u bazi
        if (empty($ticket->qr_code_svg)) {
            // Ako nema SVG, generiši ga iz JSON-a
            if (!empty($ticket->qr_code)) {
                $qrCodeSvg = QrCode::size(300)
                    ->format('svg')
                    ->generate($ticket->qr_code);
                
                // Sačuvaj u bazu za sledeći put
                $ticket->update(['qr_code_svg' => $qrCodeSvg]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'QR code data not found',
                ], 404);
            }
        } else {
            $qrCodeSvg = $ticket->qr_code_svg;
        }

        return response()->json([
            'success' => true,
            'message' => 'QR code retrieved successfully',
            'data' => [
                'qr_code_svg' => $qrCodeSvg,
                'qr_code_data' => json_decode($ticket->qr_code, true),
                'ticket_number' => $ticket->ticket_number,
            ]
        ]);

    } catch (ModelNotFoundException $e) {
        return response()->json([
            'success' => false,
            'message' => 'Ticket not found',
        ], 404);
    } catch (\Exception $e) {
        Log::error('Error getting QR code', [
            'ticket_id' => $id,
            'error' => $e->getMessage(),
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Error retrieving QR code: ' . $e->getMessage(),
        ], 500);
    }
}

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
            Log::error('Error validating QR code', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error validating QR code',
                'valid' => false
            ], 500);
        }
    }

public function generateTicketPDF($id): JsonResponse
{
    try {
        $ticket = Ticket::with(['event.category', 'user'])
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        // Osiguraj da SVG QR kod postoji
        if (empty($ticket->qr_code_svg)) {
            if (!empty($ticket->qr_code)) {
                $qrCodeSvg = QrCode::size(300)
                    ->format('svg')
                    ->generate($ticket->qr_code);
                
                $ticket->update(['qr_code_svg' => $qrCodeSvg]);
                $ticket->refresh();
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'QR code data not available'
                ], 404);
            }
        }

        // Konvertuj SVG u base64 data URL za PDF
        $qrCodeBase64 = 'data:image/svg+xml;base64,' . base64_encode($ticket->qr_code_svg);

        $ticketData = [
            'ticket_number' => $ticket->ticket_number,
            'qr_code_svg' => $ticket->qr_code_svg,
            'qr_code_base64' => $qrCodeBase64, // SVG kao base64
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

    } catch (\Exception $e) {
        Log::error('Error generating PDF data', [
            'ticket_id' => $id,
            'error' => $e->getMessage(),
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Error generating PDF data: ' . $e->getMessage()
        ], 500);
    }
}

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
            Log::error('Error retrieving tickets', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            
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
    // PROBLEM: Originalna funkcija koristi isti query objekat više puta
    // što dovodi do pogrešnih rezultata jer se WHERE uslovi akumuliraju
    
    // REŠENJE: Koristi fresh query za svaki count
    $baseQuery = Ticket::where('user_id', $userId);
    
    // Ukupan broj karata
    $total = (clone $baseQuery)->count();
    
    // Aktivne karte
    $active = (clone $baseQuery)->where('status', 'active')->count();
    
    // Iskorišćene karte  
    $used = (clone $baseQuery)->where('status', 'used')->count();
    
    // Otkazane karte - KLJUČNA IZMENA
    $cancelled = (clone $baseQuery)->where('status', 'cancelled')->count();
    
    // Ukupno potrošeno (samo za neotkazane karte)
    $totalSpent = (clone $baseQuery)
        ->whereIn('status', ['active', 'used'])
        ->sum('price');
    
    // Nadolazeći događaji
    $upcomingEvents = (clone $baseQuery)
        ->where('status', 'active')
        ->whereHas('event', function($q) {
            $q->where('start_date', '>', now());
        })->count();
    
    // Monthly spending for the last 12 months (samo neotkazane karte)
    $monthlySpending = Ticket::where('user_id', $userId)
        ->selectRaw('DATE_FORMAT(purchase_date, "%Y-%m") as month')
        ->selectRaw('SUM(price) as amount')
        ->selectRaw('COUNT(*) as tickets_count')
        ->where('purchase_date', '>=', now()->subMonths(12))
        ->whereIn('status', ['active', 'used']) // Isključi otkazane iz spending-a
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

    // Debug logovanje za proveru
    \Log::info('Ticket stats calculation', [
        'user_id' => $userId,
        'total' => $total,
        'active' => $active,
        'used' => $used,
        'cancelled' => $cancelled,
        'verification_sum' => $active + $used + $cancelled
    ]);

    return [
        'total' => $total,
        'active' => $active,
        'used' => $used,
        'cancelled' => $cancelled,
        'total_spent' => (float) $totalSpent,
        'upcoming_events' => $upcomingEvents,
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
        } catch (\Exception $e) {
            Log::error('Error generating receipt', [
                'ticket_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error generating receipt'
            ], 500);
        }
    }

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
            Log::error('Error preparing export data', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error preparing export data',
                'data' => null
            ], 500);
        }
    }

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
            Log::error('Error retrieving purchase summary', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            
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
            Log::error('Error retrieving ticket statistics', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving ticket statistics',
                'data' => null
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $ticket = Ticket::with(['event.category', 'user'])->findOrFail($id);

            // Check if user owns the ticket
            if ($ticket->user_id !== auth()->id()) {
                return response()->json([
                    'message' => 'Unauthorized access to ticket'
                ], 403);
            }

            return response()->json($ticket);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket not found'
            ], 404);
        }
    }

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
                // Mail::to($ticket->user->email)->send(
                //     new TicketCancellationConfirmation($ticket, $refundInfo)
                // );
                Log::info('Ticket cancellation email would be sent', [
                    'ticket_id' => $ticket->id,
                    'user_email' => $ticket->user->email
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send cancellation confirmation email', [
                    'ticket_id' => $ticket->id,
                    'error' => $e->getMessage()
                ]);
            }

            Log::info('Ticket cancelled', [
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
            Log::error('Error cancelling ticket', [
                'ticket_id' => $id,
                'error' => $e->getMessage()
            ]);
            
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
            Log::error('Error validating ticket', [
                'ticket_number' => $ticketNumber,
                'error' => $e->getMessage()
            ]);
            
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
            Log::info('Ticket marked as used', [
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
            Log::error('Error marking ticket as used', [
                'ticket_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error marking ticket as used',
                'data' => null
            ], 500);
        }
    }

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