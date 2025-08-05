<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'thumbnail_url' => $this->thumbnail_url,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'location' => $this->location,
            'price' => (float) $this->price,
            'total_tickets' => $this->total_tickets,
            'available_tickets' => $this->available_tickets,
            'sold_tickets' => $this->sold_tickets,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'is_active' => $this->isActive(),
            'can_purchase' => $this->canPurchaseTickets(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
