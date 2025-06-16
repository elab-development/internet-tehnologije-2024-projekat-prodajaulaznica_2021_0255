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
        Schema::create('event_user_favorites', function (Blueprint $table) {
            $table->id();
            
            // Spoljni ključevi
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');
            
            // Dodatne kolone
            $table->timestamp('favorited_at')->useCurrent();
            $table->text('note')->nullable(); // Korisnička beleška o događaju
            
            $table->timestamps();
            
            // Jedinstvena kombinacija user_id i event_id
            $table->unique(['user_id', 'event_id'], 'unique_user_event_favorite');
            
            // Indeksi za brže pretrage
            $table->index('user_id', 'idx_favorites_user');
            $table->index('event_id', 'idx_favorites_event');
            $table->index('favorited_at', 'idx_favorites_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_user_favorites', function (Blueprint $table) {
            $table->dropIndex('idx_favorites_user');
            $table->dropIndex('idx_favorites_event');
            $table->dropIndex('idx_favorites_date');
            $table->dropUnique('unique_user_event_favorite');
        });
        
        // Zatim brišemo tabelu
        Schema::dropIfExists('event_user_favorites');
    }
};
