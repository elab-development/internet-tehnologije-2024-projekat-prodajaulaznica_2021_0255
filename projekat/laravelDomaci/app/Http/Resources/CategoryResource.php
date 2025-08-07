<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
