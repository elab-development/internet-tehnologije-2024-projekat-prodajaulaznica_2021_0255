<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
/**
 * @OA\Schema(
 *     schema="TicketResource",
 *     type="object",
 *     title="Ticket Resource",
 *     description="Represents a ticket returned by the API",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="ticket_number", type="string", example="TKT-ABC12345"),
 *     @OA\Property(property="price", type="number", format="float", example=50.0),
 *     @OA\Property(property="status", type="string", example="active"),
 *     @OA\Property(property="purchase_date", type="string", format="date-time"),
 *     @OA\Property(property="used_at", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="cancelled_at", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="discount_percentage", type="number", format="float", example=10.0),
 *     @OA\Property(property="qr_code", type="string", example="base64-encoded-qr"),
 *     @OA\Property(
 *         property="event",
 *         type="object",
 *         @OA\Property(property="id", type="integer", example=1),
 *         @OA\Property(property="name", type="string", example="Rock Concert"),
 *         @OA\Property(property="location", type="string", example="Belgrade Arena"),
 *         @OA\Property(property="start_date", type="string", format="date-time"),
 *         @OA\Property(property="end_date", type="string", format="date-time"),
 *         @OA\Property(
 *             property="category",
 *             type="object",
 *             @OA\Property(property="id", type="integer", example=1),
 *             @OA\Property(property="name", type="string", example="Music")
 *         )
 *     )
 * )
 */
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