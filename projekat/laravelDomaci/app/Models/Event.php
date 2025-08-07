<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
    'name',
    'description',
    'image_url',
    'thumbnail_url',
    'start_date',
    'end_date',
    'location',
    'price',
    'total_tickets',
    'available_tickets',
    'category_id',
    'featured'
];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'price' => 'decimal:2'
    ];

    // Relacije
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    // Dodatne metode
    public function getSoldTicketsAttribute()
    {
        return $this->total_tickets - $this->available_tickets;
    }

    public function hasAvailableTickets()
    {
        return $this->available_tickets > 0;
    }

    // Proveriti da li je događaj aktivan (nije završen)
    public function isActive()
    {
        return $this->end_date > now();
    }

    // Proveriti da li se mogu kupovati ulaznice (još nije počeo)
    public function canPurchaseTickets()
    {
        return $this->start_date > now() && $this->hasAvailableTickets();
    }
}
