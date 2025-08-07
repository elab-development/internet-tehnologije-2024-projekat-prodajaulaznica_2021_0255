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
