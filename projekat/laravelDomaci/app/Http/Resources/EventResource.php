<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
/**
 * @OA\Schema(
 *     schema="EventResource",
 *     type="object",
 *     title="Event Resource",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Concert"),
 *     @OA\Property(property="description", type="string", example="Rock concert"),
 *     @OA\Property(property="image_url", type="string", example="https://example.com/image.jpg"),
 *     @OA\Property(property="thumbnail_url", type="string", example="https://example.com/thumb.jpg"),
 *     @OA\Property(property="start_date", type="string", format="date-time"),
 *     @OA\Property(property="end_date", type="string", format="date-time"),
 *     @OA\Property(property="location", type="string", example="Belgrade Arena"),
 *     @OA\Property(property="price", type="number", format="float", example=100),
 *     @OA\Property(property="category", ref="#/components/schemas/CategoryResource")
 * )
 */
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
            'featured' => $this->featured ?? false,
            'tickets_count' => $this->when($this->relationLoaded('tickets'), $this->tickets->count()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
