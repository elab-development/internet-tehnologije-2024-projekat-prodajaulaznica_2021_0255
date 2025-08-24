<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
/**
 * @OA\Schema(
 *     schema="CategoryResource",
 *     type="object",
 *     title="Category Resource",
 *     description="Category resource returned by API",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Music"),
 *     @OA\Property(property="description", type="string", example="All music events"),
 *     @OA\Property(property="color", type="string", example="#FF0000"),
 *     @OA\Property(property="events_count", type="integer", example=5),
 *     @OA\Property(property="active_events_count", type="integer", example=3),
 *     @OA\Property(
 *         property="events",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/EventResource")
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'events_count' => $this->when(isset($this->events_count), $this->events_count),
            'active_events_count' => $this->when($this->relationLoaded('events'), 
                $this->events->where('end_date', '>', now())->count()
            ),
            'events' => EventResource::collection($this->whenLoaded('events')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

}
