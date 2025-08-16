<?php

return [
    'default' => env('QRCODE_DRIVER', 'gd'),
    
    'drivers' => [
        'gd' => [
            'class' => \SimpleSoftwareIO\QrCode\Generators\GDGenerator::class,
        ],
    ],
    
    'size' => 300,
    'margin' => 2,
    'format' => 'png',
    'error_correction' => 'M',
];