<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // Check constraint: end_date mora biti posle start_date
            $table->rawIndex('start_date, end_date', 'idx_events_date_range');
        });

        // Dodavanje constraint-a u tickets tabelu
        Schema::table('tickets', function (Blueprint $table) {
            // Check constraint: cena mora biti pozitivna
            $table->decimal('price', 8, 2)->unsigned()->change();
            
            // Dodavanje discount kolone sa constraint-om
            $table->decimal('discount_percentage', 5, 2)->default(0)->after('price');
        });

        // Dodavanje custom constraint-a kroz raw SQL
        DB::statement('ALTER TABLE events ADD CONSTRAINT chk_event_dates CHECK (end_date > start_date)');
        DB::statement('ALTER TABLE events ADD CONSTRAINT chk_event_price CHECK (price >= 0)');
        DB::statement('ALTER TABLE events ADD CONSTRAINT chk_available_tickets CHECK (available_tickets <= total_tickets AND available_tickets >= 0)');
        DB::statement('ALTER TABLE tickets ADD CONSTRAINT chk_ticket_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Uklanjanje custom constraint-a
        DB::statement('ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_dates');
        DB::statement('ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_price');
        DB::statement('ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_available_tickets');
        DB::statement('ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_ticket_discount');

        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('idx_events_date_range');
        });

        Schema::table('tickets', function (Blueprint $table) {
            // Vraćanje discount kolone
            $table->dropColumn('discount_percentage');
            
            // Vraćanje price kolone na signed
            $table->decimal('price', 8, 2)->change();
        });
    }
};
