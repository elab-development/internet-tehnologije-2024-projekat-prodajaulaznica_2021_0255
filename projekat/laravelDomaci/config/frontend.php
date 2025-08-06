<?php

return [
    'url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'domain' => env('FRONTEND_DOMAIN', 'localhost:3000'),
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
];
