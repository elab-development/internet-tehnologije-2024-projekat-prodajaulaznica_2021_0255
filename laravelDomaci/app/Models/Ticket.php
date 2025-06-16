<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'event_id',
        'purchase_date',
        'ticket_code',
        'status'
    ];

    protected $casts = [
        'purchase_date' => 'datetime'
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

    // Generisanje jedinstvenog koda ulaznice
    public static function generateTicketCode()
    {
        do {
            $code = 'TKT-' . strtoupper(uniqid());
        } while (self::where('ticket_code', $code)->exists());

        return $code;
    }
}
