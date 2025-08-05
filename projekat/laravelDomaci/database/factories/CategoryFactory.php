<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = [
            ['name' => 'Muzika', 'description' => 'Koncerti, festivali i muzička dešavanja', 'color' => '#FF6B6B'],
            ['name' => 'Sport', 'description' => 'Sportski događaji, utakmice i takmičenja', 'color' => '#4ECDC4'],
            ['name' => 'Teatar', 'description' => 'Pozorišne predstave i dramski sadržaji', 'color' => '#45B7D1'],
            ['name' => 'Film', 'description' => 'Filmske projekcije i kinematografski događaji', 'color' => '#96CEB4'],
            ['name' => 'Kultura', 'description' => 'Kulturni događaji, izložbe i festivali', 'color' => '#FECA57'],
            ['name' => 'Edukacija', 'description' => 'Seminari, radionice i edukativni sadržaji', 'color' => '#FF9FF3'],
            ['name' => 'Gastronomija', 'description' => 'Kulinarni eventi i degustacije', 'color' => '#54A0FF'],
            ['name' => 'Tehnologija', 'description' => 'Tech meetup-ovi i konferencije', 'color' => '#5F27CD'],
        ];

        $category = $this->faker->randomElement($categories);
        
        return [
            'name' => $category['name'],
            'description' => $category['description'],
            'color' => $category['color'],
        ];
    }
}