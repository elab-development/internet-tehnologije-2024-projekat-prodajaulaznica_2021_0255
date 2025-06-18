<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Ticket>
 */
class TicketFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $discountPercentage = $this->faker->randomElement([0, 0, 0, 5, 10, 15, 20]); // Češće bez popusta
        $originalPrice = $this->faker->randomFloat(2, 500, 15000);
        $finalPrice = $originalPrice * (1 - $discountPercentage / 100);
        
        return [
            'ticket_number' => 'TKT-' . strtoupper(Str::random(8)),
            'qr_code' => Str::uuid(),
            'price' => $finalPrice,
            'discount_percentage' => $discountPercentage,
            'status' => $this->faker->randomElement(['active', 'active', 'active', 'used', 'cancelled']), // Češće active
            'purchase_date' => $this->faker->dateTimeBetween('-3 months', 'now'),
            'event_id' => Event::factory(),
            'user_id' => User::factory(),
        ];
    }

    /**
     * Indicate that the ticket is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    /**
     * Indicate that the ticket is used.
     */
    public function used(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'used',
        ]);
    }

    /**
     * Indicate that the ticket is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }
}