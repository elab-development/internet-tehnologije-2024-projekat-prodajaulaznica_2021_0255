<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'qr_code' => $this->qr_code,
            'price' => (float) $this->price,
            'original_price' => (float) $this->original_price,
            'discount_percentage' => (float) $this->discount_percentage,
            'discount_amount' => (float) $this->discount_amount,
            'status' => $this->status,
            'purchase_date' => $this->purchase_date,
            'is_active' => $this->isActive(),
            'is_valid' => $this->isValid(),
            'event' => new EventResource($this->whenLoaded('event')),
            'user' => $this->when($this->relationLoaded('user'), [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
