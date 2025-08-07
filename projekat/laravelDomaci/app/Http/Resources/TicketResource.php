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
            'used_at' => $this->used_at,
            'cancelled_at' => $this->cancelled_at,
            'refund_amount' => $this->when($this->refund_amount, (float) $this->refund_amount),
            'cancellation_fee' => $this->when($this->cancellation_fee, (float) $this->cancellation_fee),
            'cancellation_reason' => $this->cancellation_reason,
            'is_active' => $this->isActive(),
            'is_valid' => $this->isValid(),
            'can_be_used' => $this->canBeUsed(),
            'can_be_cancelled' => $this->when($this->relationLoaded('event'), $this->canBeCancelled()),
            'event' => new EventResource($this->whenLoaded('event')),
            'user' => $this->when($this->relationLoaded('user'), [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'validation_info' => $this->when($this->relationLoaded('event'), function() {
                return $this->getValidationInfo();
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }


}
