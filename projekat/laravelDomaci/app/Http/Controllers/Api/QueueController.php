<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserQueue;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class QueueController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/queue/join",
     *     summary="Join the queue system",
     *     description="Allows a user to join the queue system. If queue is disabled or there's available capacity, grants direct access. Otherwise, adds user to waiting queue.",
     *     operationId="joinQueue",
     *     tags={"Queue Management"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successfully joined queue or granted access",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Direct access granted"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="status", type="string", enum={"active", "waiting"}, example="active"),
     *                 @OA\Property(property="can_access", type="boolean", example=true),
     *                 @OA\Property(property="position", type="integer", example=0, description="Position in queue (0 for active users)"),
     *                 @OA\Property(property="estimated_wait_time", type="integer", example=5, description="Estimated wait time in minutes"),
     *                 @OA\Property(property="expires_at", type="string", format="date-time", example="2024-01-01T15:30:00Z"),
     *                 @OA\Property(property="session_duration", type="integer", example=15, description="Session duration in minutes"),
     *                 @OA\Property(property="queue_id", type="integer", example=123)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Database transaction failed")
     *         )
     *     )
     * )
     */
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

   /**
 * @OA\Get(
 *     path="/api/queue/status",
 *     summary="Check current queue status",
 *     description="Retrieves the current status of the user in the queue system, including position, wait time, and access permissions.",
 *     operationId="checkQueueStatus",
 *     tags={"Queue Management"},
 *     security={{"bearerAuth": {}}},
 *     @OA\Response(
 *         response=200,
 *         description="Queue status response",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=true, description="True if user is in queue, false otherwise"),
 *             @OA\Property(property="message", type="string", example="Queue status retrieved"),
 *             @OA\Property(
 *                 property="data",
 *                 type="object",
 *                 @OA\Property(property="status", type="string", enum={"active", "waiting", "not_in_queue"}, example="waiting", description="Current queue status"),
 *                 @OA\Property(property="can_access", type="boolean", example=false, description="Whether the user can access the resource now"),
 *                 @OA\Property(property="position", type="integer", example=5, description="User's position in the queue, if applicable"),
 *                 @OA\Property(property="estimated_wait_time", type="integer", example=10, description="Estimated wait time in minutes"),
 *                 @OA\Property(property="expires_at", type="string", format="date-time", example="2024-01-01T15:30:00Z", description="Time when access expires"),
 *                 @OA\Property(property="total_waiting", type="integer", example=25, description="Total number of users waiting"),
 *                 @OA\Property(property="total_active", type="integer", example=100, description="Total number of active users")
 *             )
 *         )
 *     ),
 *     @OA\Response(
 *         response=400,
 *         description="Bad request",
 *         @OA\JsonContent(
 *             @OA\Property(property="success", type="boolean", example=false),
 *             @OA\Property(property="message", type="string", example="Invalid request")
 *         )
 *     )
 * )
 */

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

    /**
     * @OA\Delete(
     *     path="/api/queue/leave",
     *     summary="Leave the queue",
     *     description="Removes the user from the queue system and reorders remaining users in the waiting queue.",
     *     operationId="leaveQueue",
     *     tags={"Queue Management"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successfully left the queue",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Left queue successfully")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/api/admin/queue/enable",
     *     summary="Enable the queue system",
     *     description="Activates the queue system for managing user access. Admin only endpoint.",
     *     operationId="enableQueue",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Queue system enabled successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Queue je uspešno aktiviran"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="queue_enabled", type="boolean", example=true),
     *                 @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error enabling queue",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri aktiviranju queue-a: Error details")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/api/admin/queue/disable",
     *     summary="Disable the queue system",
     *     description="Deactivates the queue system and grants access to all waiting users. Admin only endpoint.",
     *     operationId="disableQueue",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Queue system disabled successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Queue je uspešno deaktiviran. Svi korisnici u redu su aktivirani."),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="queue_enabled", type="boolean", example=false),
     *                 @OA\Property(property="activated_users", type="integer", example=25),
     *                 @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error disabling queue",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri deaktiviranju queue-a: Error details")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Put(
     *     path="/api/admin/queue/max-users",
     *     summary="Set maximum active users limit",
     *     description="Updates the maximum number of users that can be active simultaneously. Admin only endpoint.",
     *     operationId="setMaxUsers",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="max_users", type="integer", minimum=1, maximum=1000, example=150, description="Maximum number of active users")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Maximum users limit updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Maksimalni broj korisnika je postavljen na 150"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="max_users", type="integer", example=150),
     *                 @OA\Property(property="current_active", type="integer", example=125),
     *                 @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="The given data was invalid."),
     *             @OA\Property(
     *                 property="errors",
     *                 type="object",
     *                 @OA\Property(
     *                     property="max_users",
     *                     type="array",
     *                     @OA\Items(type="string", example="The max users field is required.")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error setting maximum users",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri postavljanju maksimalnog broja korisnika: Error details")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Get(
     *     path="/api/admin/queue/stats",
     *     summary="Get comprehensive queue statistics",
     *     description="Retrieves detailed statistics about the queue system including active users, waiting users, and performance metrics. Admin only endpoint.",
     *     operationId="getQueueStats",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Queue statistics retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="total_waiting", type="integer", example=25),
     *                 @OA\Property(property="total_active", type="integer", example=100),
     *                 @OA\Property(property="total_expired", type="integer", example=50),
     *                 @OA\Property(property="queue_enabled", type="boolean", example=true),
     *                 @OA\Property(property="max_active_users", type="integer", example=100),
     *                 @OA\Property(property="average_wait_time", type="number", format="float", example=8.5, description="Average wait time in minutes"),
     *                 @OA\Property(property="longest_waiting", type="number", format="float", example=15.2, description="Longest waiting time in minutes"),
     *                 @OA\Property(
     *                     property="recent_activity",
     *                     type="array",
     *                     @OA\Items(
     *                         type="object",
     *                         @OA\Property(property="id", type="integer", example=123),
     *                         @OA\Property(property="status", type="string", example="active"),
     *                         @OA\Property(property="joined_at", type="string", format="date-time", example="2024-01-01T12:00:00Z"),
     *                         @OA\Property(property="expires_at", type="string", format="date-time", example="2024-01-01T12:15:00Z"),
     *                         @OA\Property(property="user_id", type="integer", example=456)
     *                     )
     *                 )
     *             ),
     *             @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error retrieving statistics",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri dobijanju statistika: Error details")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Delete(
     *     path="/api/admin/queue/clear-waiting",
     *     summary="Clear all waiting users from queue",
     *     description="Removes all users from the waiting queue. Admin only endpoint.",
     *     operationId="clearWaitingQueue",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Waiting queue cleared successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Obrisano je 25 korisnika iz reda čekanja"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="deleted_count", type="integer", example=25),
     *                 @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error clearing waiting queue",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri brisanju reda čekanja: Error details")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Delete(
     *     path="/api/admin/queue/clear-expired",
     *     summary="Clear all expired sessions",
     *     description="Removes all expired user sessions from the queue system. Admin only endpoint.",
     *     operationId="clearExpiredSessions",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Expired sessions cleared successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Obrisano je 50 isteklih sesija"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="deleted_count", type="integer", example=50),
     *                 @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error clearing expired sessions",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri brisanju isteklih sesija: Error details")
     *         )
     *     )
     * )
     */
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

    /**
     * @OA\Post(
     *     path="/api/admin/queue/activate-next",
     *     summary="Manually activate next users in queue",
     *     description="Processes the queue and activates the next available users up to the maximum limit. Admin only endpoint.",
     *     operationId="activateNextInQueue",
     *     tags={"Queue Administration"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Users activated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Aktivirano je 5 korisnika iz reda"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="activated_count", type="integer", example=5),
     *                 @OA\Property(
     *                     property="current_stats",
     *                     type="object",
     *                     @OA\Property(property="active", type="integer", example=100),
     *                     @OA\Property(property="waiting", type="integer", example=20)
     *                 ),
     *                 @OA\Property(property="timestamp", type="string", format="date-time", example="2024-01-01T12:00:00Z")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error activating users",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Greška pri aktiviranju korisnika: Error details")
     *         )
     *     )
     * )
     */
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