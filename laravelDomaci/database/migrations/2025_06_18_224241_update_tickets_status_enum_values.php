<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ažuriranje enum vrednosti za status kolonu
        DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('active', 'used', 'cancelled') DEFAULT 'active'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Vraćanje na originalne enum vrednosti
        DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('available', 'sold', 'reserved') DEFAULT 'available'");
    }
};