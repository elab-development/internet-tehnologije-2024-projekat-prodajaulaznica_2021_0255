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
            'price' => $this->price,
            'status' => $this->status,
            'purchase_date' => $this->purchase_date?->toISOString(),
            'used_at' => $this->used_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'discount_percentage' => $this->discount_percentage ?? 0,
            'qr_code' => $this->qr_code,
            'event' => [
                'id' => $this->event->id,
                'name' => $this->event->name,
                'location' => $this->event->location,
                'start_date' => $this->event->start_date?->toISOString(),
                'end_date' => $this->event->end_date?->toISOString(),
                'category' => [
                    'id' => $this->event->category->id,
                    'name' => $this->event->category->name,
                ],
            ],
        ];
    }
}