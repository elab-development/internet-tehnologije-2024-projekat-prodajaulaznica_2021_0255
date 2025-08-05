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
        Schema::table('tickets', function (Blueprint $table) {
            // Promena dužine ticket_number kolone i dodavanje prefiksa
            $table->string('ticket_number', 50)->change();
            // Dodavanje nove kolone za QR kod
            $table->text('qr_code')->nullable()->after('ticket_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Vraćanje na originalnu dužinu
            $table->string('ticket_number', 255)->change();
            // Uklanjanje QR kod kolone
            $table->dropColumn('qr_code');
        });
    }
};
