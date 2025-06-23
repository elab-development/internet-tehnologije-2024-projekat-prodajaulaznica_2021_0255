<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'color'
    ];

    // Relacije
    public function events()
    {
        return $this->hasMany(Event::class);
    }

    // Dodatne metode
    public function getActiveEventsAttribute()
    {
        return $this->events()->where('end_date', '>', now())->count();
    }

    public function hasEvents()
    {
        return $this->events()->count() > 0;
    }
}