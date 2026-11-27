<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('title');
            $table->text('message');
            $table->string('target_view', 40)->default('orders');
            $table->string('resource_type', 40)->nullable();
            $table->string('resource_id', 40)->nullable();
            $table->boolean('highlight')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'type', 'resource_type', 'resource_id'], 'notifications_signature_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
