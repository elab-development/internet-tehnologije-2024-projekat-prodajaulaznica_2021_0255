<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'qr_code',
        'price',
        'discount_percentage',
        'status',
        'purchase_date',
        'event_id',
        'user_id'
    ];

    protected $casts = [
        'purchase_date' => 'datetime',
        'price' => 'decimal:2',
        'discount_percentage' => 'decimal:2'
    ];

    // Relacije
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    // Generisanje jedinstvenog broja ulaznice
    public static function generateTicketNumber()
    {
        do {
            $number = 'TKT-' . strtoupper(Str::random(8));
        } while (self::where('ticket_number', $number)->exists());

        return $number;
    }

    // Proveri da li je ulaznica aktivna
    public function isActive()
    {
        return $this->status === 'active';
    }

    // Proveri da li je ulaznica validna za korišćenje
    public function isValid()
    {
        return $this->isActive() && 
               $this->event->start_date <= now() &&
               $this->event->end_date > now();
    }

    // Izračunaj originalnu cenu (pre popusta)
    public function getOriginalPriceAttribute()
    {
        if ($this->discount_percentage > 0) {
            return $this->price / (1 - $this->discount_percentage / 100);
        }
        return $this->price;
    }

    // Izračunaj iznos popusta
    public function getDiscountAmountAttribute()
    {
        return $this->original_price - $this->price;
    }
}