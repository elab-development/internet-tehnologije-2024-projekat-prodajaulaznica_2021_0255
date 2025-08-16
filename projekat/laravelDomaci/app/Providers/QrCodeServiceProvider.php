<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use SimpleSoftwareIO\QrCode\Generator;

class QrCodeServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton('qrcode', function ($app) {
            return new Generator();
        });
    }

    public function boot(): void
    {
        //
    }
}