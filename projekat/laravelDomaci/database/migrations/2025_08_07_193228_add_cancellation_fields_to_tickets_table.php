<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('used_at');
            $table->decimal('refund_amount', 8, 2)->nullable()->after('cancelled_at');
            $table->decimal('cancellation_fee', 8, 2)->nullable()->after('refund_amount');
            $table->text('cancellation_reason')->nullable()->after('cancellation_fee');
            
            $table->index(['status', 'cancelled_at']);
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex(['status', 'cancelled_at']);
            $table->dropColumn(['cancelled_at', 'refund_amount', 'cancellation_fee', 'cancellation_reason']);
        });
    }
};
