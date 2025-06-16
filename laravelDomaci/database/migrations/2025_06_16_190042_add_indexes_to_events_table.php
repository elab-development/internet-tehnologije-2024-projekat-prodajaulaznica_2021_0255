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
            // Indeks za pretragu po datumu početka
            $table->index('start_date', 'idx_events_start_date');
            
            // Kompozitni indeks za kategoriju i datum
            $table->index(['category_id', 'start_date'], 'idx_events_category_date');
            
            // Indeks za lokaciju (za pretragu po gradu)
            $table->index('location', 'idx_events_location');
        });

        Schema::table('tickets', function (Blueprint $table) {
            // Indeks za status ulaznice
            $table->index('status', 'idx_tickets_status');
            
            // Kompozitni indeks za event i status
            $table->index(['event_id', 'status'], 'idx_tickets_event_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('idx_events_start_date');
            $table->dropIndex('idx_events_category_date');
            $table->dropIndex('idx_events_location');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('idx_tickets_status');
            $table->dropIndex('idx_tickets_event_status');
        });
    }
};
