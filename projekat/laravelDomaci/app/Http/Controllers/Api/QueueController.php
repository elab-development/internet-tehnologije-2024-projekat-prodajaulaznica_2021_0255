<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserQueue;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class QueueController extends Controller
{
    public function joinQueue(Request $request): JsonResponse
{
    $sessionId = $request->session()->getId();
    $userId = auth()->id();

    // Check if queue is enabled - koristi cache ili config
    $queueEnabled = cache('queue_enabled', config('app.queue_enabled', false));
    $maxActiveUsers = cache('max_active_users', config('app.max_active_users', 100));


    if (!$queueEnabled) {
        return response()->json([
            'success' => true,
            'message' => 'Queue is disabled',
            'data' => [
                'status' => 'active',
                'can_access' => true
            ]
        ]);
    }

    // Koristi database transaction za thread safety
    return DB::transaction(function () use ($sessionId, $userId, $maxActiveUsers) {
        // Proveri da li korisnik već postoji u sistemu
        $existingEntry = UserQueue::where('session_id', $sessionId)
                                  ->whereIn('status', ['waiting', 'active'])
                                  ->first();

        if ($existingEntry) {
            // Ako je već aktivan i nije expired
            if ($existingEntry->status === 'active' && $existingEntry->expires_at > now()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Already active',
                    'data' => [
                        'status' => 'active',
                        'can_access' => true,
                        'expires_at' => $existingEntry->expires_at,
                        'session_duration' => 15
                    ]
                ]);
            }
            
            // Ako čeka u redu
            if ($existingEntry->status === 'waiting') {
                return response()->json([
                    'success' => true,
                    'message' => 'Already in queue',
                    'data' => [
                        'status' => 'waiting',
                        'can_access' => false,
                        'position' => $existingEntry->position,
                        'estimated_wait_time' => $existingEntry->getEstimatedWaitTime(),
                        'queue_id' => $existingEntry->id
                    ]
                ]);
            }
        }

        // Očisti expired sesije
        UserQueue::where('status', 'active')
                 ->where('expires_at', '<', now())
                 ->update(['status' => 'expired']);

        // Broji aktivne korisnike sa lock-om
        $activeCount = UserQueue::where('status', 'active')
                                ->where('expires_at', '>', now())
                                ->lockForUpdate()
                                ->count();

        if ($activeCount < $maxActiveUsers) {
            // Direktan pristup
            $queueEntry = UserQueue::create([
                'session_id' => $sessionId,
                'user_id' => $userId,
                'position' => 0,
                'status' => 'active',
                'joined_at' => now(),
                'expires_at' => now()->addMinutes(15)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Direct access granted',
                'data' => [
                    'status' => 'active',
                    'can_access' => true,
                    'expires_at' => $queueEntry->expires_at,
                    'session_duration' => 15
                ]
            ]);
        }

        // Dodaj u red čekanja
        $queueEntry = UserQueue::addToQueue($sessionId, $userId);

        return response()->json([
            'success' => true,
            'message' => 'Added to queue',
            'data' => [
                'status' => 'waiting',
                'can_access' => false,
                'position' => $queueEntry->position,
                'estimated_wait_time' => $queueEntry->getEstimatedWaitTime(),
                'queue_id' => $queueEntry->id
            ]
        ]);
    });
}

    public function checkQueueStatus(Request $request): JsonResponse
    {
         $sessionId = $request->session()->getId();

        $queueEntry = UserQueue::where('session_id', $sessionId)
                            ->whereIn('status', ['waiting', 'active'])
                            ->first();

        if (!$queueEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Not in queue',
                'data' => [
                    'status' => 'not_in_queue',
                    'can_access' => !cache('queue_enabled', config('app.queue_enabled', false))
                ]
            ]);
        }

        // Process queue
        UserQueue::processQueue();

        // Refresh entry
        $queueEntry->refresh();

        $canAccess = $queueEntry->status === 'active' && 
                    $queueEntry->expires_at > now();

        return response()->json([
            'success' => true,
            'message' => 'Queue status retrieved',
            'data' => [
                'status' => $queueEntry->status,
                'can_access' => $canAccess,
                'position' => $queueEntry->position,
                'estimated_wait_time' => $queueEntry->getEstimatedWaitTime(),
                'expires_at' => $queueEntry->expires_at,
                'total_waiting' => UserQueue::where('status', 'waiting')->count(),
                'total_active' => UserQueue::where('status', 'active')
                                          ->where('expires_at', '>', now())
                                          ->count()
            ]
        ]);
    }

    public function leaveQueue(Request $request): JsonResponse
    {
        $sessionId = $request->session()->getId();

        $deleted = UserQueue::where('session_id', $sessionId)
                           ->whereIn('status', ['waiting', 'active'])
                           ->delete();

        if ($deleted) {
            UserQueue::reorderQueue();
        }

        return response()->json([
            'success' => true,
            'message' => 'Left queue successfully'
        ]);
    }

    // Admin functions
public function enableQueue(): JsonResponse
{
    try {
        // U produkciji, ovo bi trebalo da se čuva u bazi ili cache
        // Za sada koristimo config cache
        config(['app.queue_enabled' => true]);
        
        // Opcionalno: sačuvaj u cache za persistence
        cache(['queue_enabled' => true], now()->addHours(24));
        
        return response()->json([
            'success' => true,
            'message' => 'Queue je uspešno aktiviran',
            'data' => [
                'queue_enabled' => true,
                'timestamp' => now()
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri aktiviranju queue-a: ' . $e->getMessage()
        ], 500);
    }
}

public function disableQueue(): JsonResponse
{
    try {
        config(['app.queue_enabled' => false]);
        cache(['queue_enabled' => false], now()->addHours(24));
        
        // Kada se queue disabiluje, aktiviraj sve waiting korisnike
        UserQueue::where('status', 'waiting')
                 ->update([
                     'status' => 'active',
                     'expires_at' => now()->addMinutes(15)
                 ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Queue je uspešno deaktiviran. Svi korisnici u redu su aktivirani.',
            'data' => [
                'queue_enabled' => false,
                'activated_users' => UserQueue::where('status', 'active')->count(),
                'timestamp' => now()
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri deaktiviranju queue-a: ' . $e->getMessage()
        ], 500);
    }
}

public function setMaxUsers(Request $request): JsonResponse
{
    try {
        $request->validate([
            'max_users' => 'required|integer|min:1|max:1000'
        ]);

        $maxUsers = $request->max_users;
        config(['app.max_active_users' => $maxUsers]);
        cache(['max_active_users' => $maxUsers], now()->addHours(24));

        // Ako je novi limit manji od trenutnog broja aktivnih korisnika
        $currentActive = UserQueue::where('status', 'active')
                                 ->where('expires_at', '>', now())
                                 ->count();

        $message = "Maksimalni broj korisnika je postavljen na {$maxUsers}";
        
        if ($currentActive > $maxUsers) {
            $message .= " Trenutno je aktivno {$currentActive} korisnika, što je više od novog limita.";
        }

        // Pokreni queue processing sa novim limitom
        UserQueue::processQueue($maxUsers);

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'max_users' => $maxUsers,
                'current_active' => UserQueue::where('status', 'active')
                                           ->where('expires_at', '>', now())
                                           ->count(),
                'timestamp' => now()
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri postavljanju maksimalnog broja korisnika: ' . $e->getMessage()
        ], 500);
    }
}

public function getQueueStats(): JsonResponse
{
    try {
        // Očisti expired sesije pre dobijanja statistika
        UserQueue::where('status', 'active')
                 ->where('expires_at', '<', now())
                 ->update(['status' => 'expired']);

        $stats = [
            'total_waiting' => UserQueue::where('status', 'waiting')->count(),
            'total_active' => UserQueue::where('status', 'active')
                                      ->where('expires_at', '>', now())
                                      ->count(),
            'total_expired' => UserQueue::where('status', 'expired')->count(),
            'queue_enabled' => cache('queue_enabled', config('app.queue_enabled', false)),
            'max_active_users' => cache('max_active_users', config('app.max_active_users', 100)),
            'average_wait_time' => $this->calculateAverageWaitTime(),
            'longest_waiting' => $this->getLongestWaitingTime(),
            'recent_activity' => $this->getRecentActivity(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
            'timestamp' => now()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri dobijanju statistika: ' . $e->getMessage()
        ], 500);
    }
}

// Nove admin metode
public function clearWaitingQueue(): JsonResponse
{
    try {
        $deletedCount = UserQueue::where('status', 'waiting')->delete();
        
        return response()->json([
            'success' => true,
            'message' => "Obrisano je {$deletedCount} korisnika iz reda čekanja",
            'data' => [
                'deleted_count' => $deletedCount,
                'timestamp' => now()
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri brisanju reda čekanja: ' . $e->getMessage()
        ], 500);
    }
}

public function clearExpiredSessions(): JsonResponse
{
    try {
        $deletedCount = UserQueue::where('status', 'expired')->delete();
        
        return response()->json([
            'success' => true,
            'message' => "Obrisano je {$deletedCount} isteklih sesija",
            'data' => [
                'deleted_count' => $deletedCount,
                'timestamp' => now()
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri brisanju isteklih sesija: ' . $e->getMessage()
        ], 500);
    }
}

public function activateNextInQueue(): JsonResponse
{
    try {
        $maxActive = cache('max_active_users', config('app.max_active_users', 100));
        $activatedCount = UserQueue::processQueue($maxActive);
        
        return response()->json([
            'success' => true,
            'message' => "Aktivirano je {$activatedCount} korisnika iz reda",
            'data' => [
                'activated_count' => $activatedCount,
                'current_stats' => [
                    'active' => UserQueue::where('status', 'active')
                                        ->where('expires_at', '>', now())
                                        ->count(),
                    'waiting' => UserQueue::where('status', 'waiting')->count()
                ],
                'timestamp' => now()
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Greška pri aktiviranju korisnika: ' . $e->getMessage()
        ], 500);
    }
}

// Helper metode
private function calculateAverageWaitTime()
{
    $waitingUsers = UserQueue::where('status', 'waiting')->get();
    
    if ($waitingUsers->isEmpty()) {
        return 0;
    }
    
    $totalWaitTime = $waitingUsers->sum(function ($user) {
        return $user->getEstimatedWaitTime();
    });
    
    return round($totalWaitTime / $waitingUsers->count(), 1);
}

private function getLongestWaitingTime()
{
    $longestWaiting = UserQueue::where('status', 'waiting')
                               ->orderBy('joined_at')
                               ->first();
    
    if (!$longestWaiting) {
        return 0;
    }
    
    return round(now()->diffInMinutes($longestWaiting->joined_at), 1);
}

private function getRecentActivity()
{
    return UserQueue::whereIn('status', ['active', 'waiting', 'expired'])
                   ->where('created_at', '>', now()->subHour())
                   ->orderBy('created_at', 'desc')
                   ->limit(10)
                   ->get()
                   ->map(function ($entry) {
                       return [
                           'id' => $entry->id,
                           'status' => $entry->status,
                           'joined_at' => $entry->joined_at,
                           'expires_at' => $entry->expires_at,
                           'user_id' => $entry->user_id,
                       ];
                   });
}
    
}