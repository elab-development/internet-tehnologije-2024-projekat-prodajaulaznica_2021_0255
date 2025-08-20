<?php
// Create app/Http/Controllers/Api/AdminDashboardController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/admin/dashboard/overview",
     *     summary="Get admin dashboard overview statistics",
     *     description="Retrieve comprehensive overview statistics including events, tickets, revenue, and percentage changes compared to last month",
     *     operationId="getOverviewStats",
     *     tags={"Admin Dashboard"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Overview statistics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Overview statistics retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="total_events", type="integer", example=45, description="Total number of events"),
     *                 @OA\Property(property="active_events", type="integer", example=12, description="Number of active events"),
     *                 @OA\Property(property="total_tickets_sold", type="integer", example=1250, description="Total tickets sold (active + used)"),
     *                 @OA\Property(property="total_revenue", type="number", format="float", example=125000.50, description="Total revenue from sold tickets"),
     *                 @OA\Property(property="total_users", type="integer", example=890, description="Total number of users"),
     *                 @OA\Property(property="pending_validations", type="integer", example=45, description="Active tickets for ongoing events"),
     *                 @OA\Property(property="cancelled_tickets", type="integer", example=23, description="Number of cancelled tickets"),
     *                 @OA\Property(property="refund_amount", type="number", format="float", example=5600.00, description="Total refund amount"),
     *                 @OA\Property(property="revenue_change", type="number", format="float", example=15.5, description="Revenue percentage change from last month"),
     *                 @OA\Property(property="tickets_change", type="number", format="float", example=8.2, description="Tickets sold percentage change from last month")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving overview statistics"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getOverviewStats(): JsonResponse
    {
        try {
            $stats = [
                'total_events' => Event::count(),
                'active_events' => Event::where('end_date', '>', now())->count(),
                'total_tickets_sold' => Ticket::whereIn('status', ['active', 'used'])->count(),
                'total_revenue' => Ticket::whereIn('status', ['active', 'used'])->sum('price'),
                'total_users' => User::count(),
                'pending_validations' => Ticket::where('status', 'active')
                    ->whereHas('event', function($q) {
                        $q->where('start_date', '<=', now())
                          ->where('end_date', '>', now());
                    })->count(),
                'cancelled_tickets' => Ticket::where('status', 'cancelled')->count(),
                'refund_amount' => Ticket::where('status', 'cancelled')->sum('refund_amount'),
            ];

            // Calculate percentage changes (compared to last month)
            $lastMonth = now()->subMonth();
            $stats['revenue_change'] = $this->calculatePercentageChange(
                Ticket::whereIn('status', ['active', 'used'])
                    ->where('purchase_date', '>=', $lastMonth)
                    ->sum('price'),
                Ticket::whereIn('status', ['active', 'used'])
                    ->where('purchase_date', '<', $lastMonth)
                    ->where('purchase_date', '>=', $lastMonth->copy()->subMonth())
                    ->sum('price')
            );

            $stats['tickets_change'] = $this->calculatePercentageChange(
                Ticket::whereIn('status', ['active', 'used'])
                    ->where('purchase_date', '>=', $lastMonth)
                    ->count(),
                Ticket::whereIn('status', ['active', 'used'])
                    ->where('purchase_date', '<', $lastMonth)
                    ->where('purchase_date', '>=', $lastMonth->copy()->subMonth())
                    ->count()
            );

            return response()->json([
                'success' => true,
                'message' => 'Overview statistics retrieved successfully',
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving overview statistics',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/admin/dashboard/revenue-chart",
     *     summary="Get revenue chart data",
     *     description="Retrieve daily revenue and ticket sales data for chart visualization over specified period",
     *     operationId="getRevenueChart",
     *     tags={"Admin Dashboard"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="period",
     *         in="query",
     *         description="Number of days to retrieve data for",
     *         required=false,
     *         @OA\Schema(type="integer", default=30, example=30)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Revenue chart data retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Revenue chart data retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="date", type="string", format="date", example="2024-01-15", description="Date in Y-m-d format"),
     *                     @OA\Property(property="formatted_date", type="string", example="15.01", description="Date in d.m format for display"),
     *                     @OA\Property(property="revenue", type="number", format="float", example=2500.50, description="Revenue for the day"),
     *                     @OA\Property(property="tickets_sold", type="integer", example=25, description="Number of tickets sold on the day")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving revenue chart data"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getRevenueChart(Request $request): JsonResponse
    {
        try {
            $period = $request->get('period', '30'); // days
            $startDate = now()->subDays($period);

            $revenueData = Ticket::whereIn('status', ['active', 'used'])
                ->where('purchase_date', '>=', $startDate)
                ->select(
                    DB::raw('DATE(purchase_date) as date'),
                    DB::raw('SUM(price) as revenue'),
                    DB::raw('COUNT(*) as tickets_sold')
                )
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Fill missing dates with zero values
            $chartData = [];
            $currentDate = $startDate->copy();
            
            while ($currentDate <= now()) {
                $dateStr = $currentDate->format('Y-m-d');
                $dayData = $revenueData->firstWhere('date', $dateStr);
                
                $chartData[] = [
                    'date' => $dateStr,
                    'formatted_date' => $currentDate->format('d.m'),
                    'revenue' => $dayData ? (float) $dayData->revenue : 0,
                    'tickets_sold' => $dayData ? $dayData->tickets_sold : 0,
                ];
                
                $currentDate->addDay();
            }

            return response()->json([
                'success' => true,
                'message' => 'Revenue chart data retrieved successfully',
                'data' => $chartData
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving revenue chart data',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/admin/dashboard/category-stats",
     *     summary="Get category statistics",
     *     description="Retrieve comprehensive statistics for all event categories including events count, tickets sold, revenue and average ticket price",
     *     operationId="getCategoryStats",
     *     tags={"Admin Dashboard"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Category statistics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Category statistics retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1, description="Category ID"),
     *                     @OA\Property(property="name", type="string", example="Koncerti", description="Category name"),
     *                     @OA\Property(property="color", type="string", example="#FF5733", description="Category color hex code"),
     *                     @OA\Property(property="events_count", type="integer", example=15, description="Number of events in category"),
     *                     @OA\Property(property="tickets_sold", type="integer", example=450, description="Total tickets sold for category"),
     *                     @OA\Property(property="revenue", type="number", format="float", example=45000.00, description="Total revenue for category"),
     *                     @OA\Property(property="avg_ticket_price", type="number", format="float", example=100.00, description="Average ticket price for category")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving category statistics"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getCategoryStats(): JsonResponse
    {
        try {
            $categoryStats = Category::withCount(['events'])
                ->with(['events' => function($query) {
                    $query->withCount(['tickets' => function($q) {
                        $q->whereIn('status', ['active', 'used']);
                    }]);
                }])
                ->get()
                ->map(function($category) {
                    $totalTickets = $category->events->sum('tickets_count');
                    $totalRevenue = $category->events->sum(function($event) {
                        return $event->tickets()->whereIn('status', ['active', 'used'])->sum('price');
                    });

                    return [
                        'id' => $category->id,
                        'name' => $category->name,
                        'color' => $category->color,
                        'events_count' => $category->events_count,
                        'tickets_sold' => $totalTickets,
                        'revenue' => $totalRevenue,
                        'avg_ticket_price' => $totalTickets > 0 ? $totalRevenue / $totalTickets : 0,
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Category statistics retrieved successfully',
                'data' => $categoryStats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving category statistics',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/admin/dashboard/top-events",
     *     summary="Get top performing events",
     *     description="Retrieve top performing events sorted by revenue, tickets sold, or attendance rate",
     *     operationId="getTopEvents",
     *     tags={"Admin Dashboard"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="limit",
     *         in="query",
     *         description="Number of events to retrieve",
     *         required=false,
     *         @OA\Schema(type="integer", default=10, example=10)
     *     ),
     *     @OA\Parameter(
     *         name="sort_by",
     *         in="query",
     *         description="Sort criteria",
     *         required=false,
     *         @OA\Schema(
     *             type="string",
     *             enum={"revenue", "tickets_sold", "attendance_rate"},
     *             default="revenue",
     *             example="revenue"
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Top events retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Top events retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1, description="Event ID"),
     *                     @OA\Property(property="name", type="string", example="Rock koncert", description="Event name"),
     *                     @OA\Property(property="category", type="string", example="Koncerti", description="Category name"),
     *                     @OA\Property(property="category_color", type="string", example="#FF5733", description="Category color"),
     *                     @OA\Property(property="start_date", type="string", format="datetime", example="2024-02-15 20:00:00", description="Event start date"),
     *                     @OA\Property(property="location", type="string", example="Arena Zagreb", description="Event location"),
     *                     @OA\Property(property="total_tickets", type="integer", example=500, description="Total available tickets"),
     *                     @OA\Property(property="tickets_sold", type="integer", example=450, description="Number of tickets sold"),
     *                     @OA\Property(property="revenue", type="number", format="float", example=45000.00, description="Total revenue"),
     *                     @OA\Property(property="attendance_rate", type="number", format="float", example=90.0, description="Attendance rate percentage"),
     *                     @OA\Property(property="status", type="string", enum={"active", "completed"}, example="active", description="Event status")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving top events"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getTopEvents(Request $request): JsonResponse
    {
        try {
            $limit = $request->get('limit', 10);
            $sortBy = $request->get('sort_by', 'revenue'); // revenue, tickets_sold, attendance_rate

            $query = Event::with(['category'])
                ->withCount(['tickets as tickets_sold' => function($q) {
                    $q->whereIn('status', ['active', 'used']);
                }])
                ->withSum(['tickets as revenue' => function($q) {
                    $q->whereIn('status', ['active', 'used']);
                }], 'price');

            switch ($sortBy) {
                case 'tickets_sold':
                    $query->orderBy('tickets_sold', 'desc');
                    break;
                case 'attendance_rate':
                    $query->orderByRaw('(tickets_sold / total_tickets) DESC');
                    break;
                default: // revenue
                    $query->orderBy('revenue', 'desc');
                    break;
            }

            $topEvents = $query->limit($limit)->get()->map(function($event) {
                $attendanceRate = $event->total_tickets > 0 
                    ? ($event->tickets_sold / $event->total_tickets) * 100 
                    : 0;

                return [
                    'id' => $event->id,
                    'name' => $event->name,
                    'category' => $event->category->name,
                    'category_color' => $event->category->color,
                    'start_date' => $event->start_date,
                    'location' => $event->location,
                    'total_tickets' => $event->total_tickets,
                    'tickets_sold' => $event->tickets_sold,
                    'revenue' => (float) $event->revenue ?: 0,
                    'attendance_rate' => round($attendanceRate, 1),
                    'status' => $event->end_date > now() ? 'active' : 'completed',
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Top events retrieved successfully',
                'data' => $topEvents
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving top events',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/admin/dashboard/recent-activity",
     *     summary="Get recent activity feed",
     *     description="Retrieve recent ticket purchases and cancellations for activity monitoring",
     *     operationId="getRecentActivity",
     *     tags={"Admin Dashboard"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="limit",
     *         in="query",
     *         description="Number of activities to retrieve",
     *         required=false,
     *         @OA\Schema(type="integer", default=20, example=20)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Recent activity retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Recent activity retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="type", type="string", enum={"purchase", "cancellation"}, example="purchase", description="Activity type"),
     *                     @OA\Property(property="id", type="integer", example=123, description="Ticket ID"),
     *                     @OA\Property(property="description", type="string", example="Marko Petrović kupio kartu za Rock koncert", description="Activity description"),
     *                     @OA\Property(property="amount", type="number", format="float", example=100.00, description="Transaction amount"),
     *                     @OA\Property(property="timestamp", type="string", format="datetime", example="2024-01-15 14:30:00", description="Activity timestamp"),
     *                     @OA\Property(property="user", type="string", example="Marko Petrović", description="User name"),
     *                     @OA\Property(property="event", type="string", example="Rock koncert", description="Event name"),
     *                     @OA\Property(property="ticket_number", type="string", example="TKT-2024-001", description="Ticket number")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving recent activity"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getRecentActivity(Request $request): JsonResponse
    {
        try {
            $limit = $request->get('limit', 20);

            // Get recent ticket purchases
            $recentPurchases = Ticket::with(['event', 'user'])
                ->whereIn('status', ['active', 'used'])
                ->orderBy('purchase_date', 'desc')
                ->limit($limit)
                ->get()
                ->map(function($ticket) {
                    return [
                        'type' => 'purchase',
                        'id' => $ticket->id,
                        'description' => "{$ticket->user->name} kupio kartu za {$ticket->event->name}",
                        'amount' => $ticket->price,
                        'timestamp' => $ticket->purchase_date,
                        'user' => $ticket->user->name,
                        'event' => $ticket->event->name,
                        'ticket_number' => $ticket->ticket_number,
                    ];
                });

            // Get recent cancellations
            $recentCancellations = Ticket::with(['event', 'user'])
                ->where('status', 'cancelled')
                ->whereNotNull('cancelled_at')
                ->orderBy('cancelled_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function($ticket) {
                    return [
                        'type' => 'cancellation',
                        'id' => $ticket->id,
                        'description' => "{$ticket->user->name} otkazao kartu za {$ticket->event->name}",
                        'amount' => $ticket->refund_amount,
                        'timestamp' => $ticket->cancelled_at,
                        'user' => $ticket->user->name,
                        'event' => $ticket->event->name,
                        'ticket_number' => $ticket->ticket_number,
                    ];
                });

            // Merge and sort by timestamp
            $allActivity = $recentPurchases->concat($recentCancellations)
                ->sortByDesc('timestamp')
                ->take($limit)
                ->values();

            return response()->json([
                'success' => true,
                'message' => 'Recent activity retrieved successfully',
                'data' => $allActivity
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving recent activity',
                'data' => null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/admin/dashboard/upcoming-events",
     *     summary="Get upcoming events with urgency indicators",
     *     description="Retrieve upcoming events within next 30 days with sales statistics and urgency indicators for admin monitoring",
     *     operationId="getUpcomingEvents",
     *     tags={"Admin Dashboard"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Upcoming events retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Upcoming events retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     type="object",
     *                     @OA\Property(property="id", type="integer", example=1, description="Event ID"),
     *                     @OA\Property(property="name", type="string", example="Jazz večer", description="Event name"),
     *                     @OA\Property(property="start_date", type="string", format="datetime", example="2024-02-20 19:00:00", description="Event start date"),
     *                     @OA\Property(property="location", type="string", example="Lisinski", description="Event location"),
     *                     @OA\Property(property="category", type="string", example="Koncerti", description="Category name"),
     *                     @OA\Property(property="category_color", type="string", example="#FF5733", description="Category color"),
     *                     @OA\Property(property="total_tickets", type="integer", example=300, description="Total available tickets"),
     *                     @OA\Property(property="tickets_sold", type="integer", example=120, description="Number of tickets sold"),
     *                     @OA\Property(property="available_tickets", type="integer", example=180, description="Number of available tickets"),
     *                     @OA\Property(property="sales_rate", type="number", format="float", example=40.0, description="Sales rate percentage"),
     *                     @OA\Property(property="days_until", type="integer", example=15, description="Days until event"),
     *                     @OA\Property(property="urgency", type="string", enum={"low", "normal", "medium", "high"}, example="normal", description="Urgency level based on sales and time")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Error retrieving upcoming events"),
     *             @OA\Property(property="data", type="null")
     *         )
     *     )
     * )
     */
    public function getUpcomingEvents(): JsonResponse
    {
        try {
            $upcomingEvents = Event::with(['category'])
                ->where('start_date', '>', now())
                ->where('start_date', '<=', now()->addDays(30))
                ->withCount(['tickets as tickets_sold' => function($q) {
                    $q->whereIn('status', ['active', 'used']);
                }])
                ->orderBy('start_date')
                ->get()
                ->map(function($event) {
                    $daysUntil = now()->diffInDays($event->start_date);
                    $salesRate = $event->total_tickets > 0 
                        ? ($event->tickets_sold / $event->total_tickets) * 100 
                        : 0;

                    return [
                        'id' => $event->id,
                        'name' => $event->name,
                        'start_date' => $event->start_date,
                        'location' => $event->location,
                        'category' => $event->category->name,
                        'category_color' => $event->category->color,
                        'total_tickets' => $event->total_tickets,
                        'tickets_sold' => $event->tickets_sold,
                        'available_tickets' => $event->available_tickets,
                        'sales_rate' => round($salesRate, 1),
                        'days_until' => $daysUntil,
                        'urgency' => $this->getEventUrgency($daysUntil, $salesRate),
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Upcoming events retrieved successfully',
                'data' => $upcomingEvents
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving upcoming events',
                'data' => null
            ], 500);
        }
    }

    private function calculatePercentageChange($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        
        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function getEventUrgency($daysUntil, $salesRate)
    {
        if ($daysUntil <= 3 && $salesRate < 50) {
            return 'high'; // Event soon with low sales
        } elseif ($daysUntil <= 7 && $salesRate < 30) {
            return 'medium'; // Event within a week with very low sales
        } elseif ($salesRate > 90) {
            return 'low'; // Almost sold out
        }
        
        return 'normal';
    }
}