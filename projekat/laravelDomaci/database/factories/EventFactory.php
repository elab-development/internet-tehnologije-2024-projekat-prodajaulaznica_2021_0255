<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('now', '+6 months');
        $endDate = $this->faker->dateTimeBetween($startDate, $startDate->format('Y-m-d H:i:s') . ' +8 hours');
        $totalTickets = $this->faker->numberBetween(50, 500);
        
        $eventNames = [
            'Nezaboravna noć muzike',
            'Veliki sportski spektakl',
            'Magična pozorišna večer',
            'Festival savremene umetnosti',
            'Tech konferencija 2025',
            'Kulinarsko putovanje',
            'Edukativni seminar',
            'Koncert pod zvezdama',
            'Filmski maraton',
            'Kulturni bazar'
        ];

        $locations = [
            'Beogradska arena, Beograd',
            'Sava centar, Beograd',
            'Narodno pozorište, Novi Sad',
            'Dom kulture, Kragujevac',
            'Sportski centar, Niš',
            'Kulturni centar, Subotica',
            'Hotel Metropol, Beograd',
            'Tašmajdan park, Beograd',
            'Petrovaradin tvrđava, Novi Sad',
            'Knez Mihailova, Beograd'
        ];

        return [
            'name' => $this->faker->randomElement($eventNames) . ' ' . $this->faker->year(),
            'description' => $this->faker->paragraph(3),
            'image_url' => $this->faker->imageUrl(800, 600, 'events'),
            'thumbnail_url' => $this->faker->imageUrl(300, 200, 'events'),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'location' => $this->faker->randomElement($locations),
            'price' => $this->faker->randomFloat(2, 500, 15000), // 500 - 15000 RSD
            'total_tickets' => $totalTickets,
            'available_tickets' => $this->faker->numberBetween(0, $totalTickets),
            'category_id' => Category::factory(),
        ];
    }
}