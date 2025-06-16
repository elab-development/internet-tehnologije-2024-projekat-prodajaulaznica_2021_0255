<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'event_date',
        'location',
        'ticket_price',
        'available_tickets',
        'category_id'
    ];

    protected $casts = [
        'event_date' => 'datetime',
        'ticket_price' => 'decimal:2'
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
        return $this->tickets()->count();
    }

    public function getRemainingTicketsAttribute()
    {
        return $this->available_tickets - $this->sold_tickets;
    }

    public function hasAvailableTickets()
    {
        return $this->remaining_tickets > 0;
    }
}
