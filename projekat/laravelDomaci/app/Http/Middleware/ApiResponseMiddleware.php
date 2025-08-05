<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ApiResponseMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Only modify JSON responses
        if ($response instanceof JsonResponse) {
            $data = $response->getData(true);
            
            // If response already has success/error structure, leave it
            if (isset($data['success']) || isset($data['error'])) {
                return $response;
            }

            $statusCode = $response->getStatusCode();
            
            // Standardize successful responses
            if ($statusCode >= 200 && $statusCode < 300) {
                $standardized = [
                    'success' => true,
                    'message' => $data['message'] ?? 'Request successful',
                    'data' => $data
                ];
            } else {
                // Standardize error responses
                $standardized = [
                    'success' => false,
                    'message' => $data['message'] ?? 'Request failed',
                    'errors' => $data['errors'] ?? null,
                    'data' => null
                ];
            }

            $response->setData($standardized);
        }

        return $response;
    }
}
