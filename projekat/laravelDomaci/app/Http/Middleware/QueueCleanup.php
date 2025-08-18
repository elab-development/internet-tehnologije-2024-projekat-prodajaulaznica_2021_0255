<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\UserQueue;

class QueueCleanup
{
    public function handle($request, Closure $next)
    {
        // Očisti expired sesije
        UserQueue::where('status', 'active')
                 ->where('expires_at', '<', now())
                 ->update(['status' => 'expired']);

        return $next($request);
    }
}