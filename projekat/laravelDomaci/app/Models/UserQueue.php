<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;

class UserQueue extends Model
{
    use HasFactory;

    protected $table = 'user_queue';

    protected $fillable = [
        'session_id',
        'user_id',
        'position',
        'status',
        'joined_at',
        'expires_at'
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function addToQueue($sessionId, $userId = null)
{
    return DB::transaction(function () use ($sessionId, $userId) {
        // Check if already in queue
        $existing = self::where('session_id', $sessionId)
                       ->where('status', 'waiting')
                       ->first();
        
        if ($existing) {
            return $existing;
        }

        // Get next position sa lock-om
        $nextPosition = self::where('status', 'waiting')
                           ->lockForUpdate()
                           ->max('position') + 1;

        return self::create([
            'session_id' => $sessionId,
            'user_id' => $userId,
            'position' => $nextPosition,
            'status' => 'waiting',
            'joined_at' => now(),
        ]);
    });
}

    public static function processQueue($maxActive = null)
{
    if ($maxActive === null) {
        $maxActive = config('app.max_active_users', 100);
    }

    // Koristi database lock za thread safety
    return DB::transaction(function () use ($maxActive) {
        // Očisti expired sesije prvo
        self::where('status', 'active')
           ->where('expires_at', '<', now())
           ->update(['status' => 'expired']);

        // Broji trenutno aktivne korisnike
        $activeCount = self::where('status', 'active')
                          ->where('expires_at', '>', now())
                          ->lockForUpdate() // Važno za thread safety
                          ->count();

        // Koliko možemo da aktiviramo
        $canActivate = max(0, $maxActive - $activeCount);

        if ($canActivate > 0) {
            // Aktiviraj sledeće korisnike u redu
            $waitingUsers = self::where('status', 'waiting')
                               ->orderBy('position')
                               ->limit($canActivate)
                               ->lockForUpdate()
                               ->get();

            foreach ($waitingUsers as $user) {
                $user->update([
                    'status' => 'active',
                    'expires_at' => now()->addMinutes(15)
                ]);
            }

            // Reorder queue positions
            self::reorderQueue();
            
            return $waitingUsers->count();
        }

        return 0;
    });
}

    public static function reorderQueue()
    {
        $waitingUsers = self::where('status', 'waiting')
                           ->orderBy('position')
                           ->get();

        foreach ($waitingUsers as $index => $user) {
            $user->update(['position' => $index + 1]);
        }
    }

    public function getEstimatedWaitTime()
    {
        $avgProcessingTime = 2; // minutes per user
        return $this->position * $avgProcessingTime;
    }
}