<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Event;
use App\Models\Ticket;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class EventTicketSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Kreiranje test korisnika
        $testUser = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com', //ovo je email
            'email_verified_at' => now(),
            'password' => Hash::make('test123'), //ovo je sifra
        ]);

        // Kreiranje admin korisnika
        $adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com', //ovo je email
            'email_verified_at' => now(),
            'password' => Hash::make('admin123'), //ovo je sifra
        ]);

        // Kreiranje dodatnih korisnika
        User::factory(8)->create();

        // Kreiranje kategorija
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

        foreach ($categories as $categoryData) {
            Category::create($categoryData);
        }

        // Kreiranje događaja
        $createdCategories = Category::all();
        
        foreach ($createdCategories as $category) {
            Event::factory(2)->create([
                'category_id' => $category->id,
            ]);
        }

        // Kreiranje ulaznica
        $events = Event::all();
        $users = User::all();

        foreach ($events as $event) {
            // Za svaki događaj kreiraj 3-8 ulaznica
            $ticketCount = rand(3, 8);
            
            for ($i = 0; $i < $ticketCount; $i++) {
                $user = $users->random();
                $discountPercentage = collect([0, 0, 0, 5, 10, 15, 20])->random();
                $finalPrice = $event->price * (1 - $discountPercentage / 100);
                
                Ticket::create([
                    'ticket_number' => 'TKT-' . strtoupper(\Illuminate\Support\Str::random(8)),
                    'qr_code' => \Illuminate\Support\Str::uuid(),
                    'price' => $finalPrice,
                    'discount_percentage' => $discountPercentage,
                    'status' => collect(['active', 'active', 'active', 'used', 'cancelled'])->random(),
                    'purchase_date' => fake()->dateTimeBetween('-2 months', 'now'),
                    'event_id' => $event->id,
                    'user_id' => $user->id,
                ]);
                
                // Ažuriraj dostupne ulaznice
                if ($event->available_tickets > 0) {
                    $event->decrement('available_tickets');
                }
            }
        }
    }
}