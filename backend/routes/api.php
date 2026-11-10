<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\IngredientController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\AiController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [\App\Http\Controllers\ProfileController::class, 'show']);
    Route::put('/profile', [\App\Http\Controllers\ProfileController::class, 'update']);
    Route::post('/profile/avatar', [\App\Http\Controllers\ProfileController::class, 'uploadAvatar']);
});

Route::post('/password/forgot', [AuthController::class, 'forgotPassword']);
Route::post('/password/verify', [AuthController::class, 'verifyCode']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('ingredients', IngredientController::class);
    Route::post('/ingredients/{ingredient}/restock', [IngredientController::class, 'restock']);
    Route::apiResource('products', ProductController::class);
    Route::get('/products/{product}/addons', [ProductController::class, 'productAddons']);
    Route::post('/products/{product}/addons', [ProductController::class, 'addProductAddon']);
    Route::put('/products/{product}/addons/{addon}', [ProductController::class, 'updateProductAddon']);
    Route::delete('/products/{product}/addons/{addon}', [ProductController::class, 'destroyProductAddon']);
    Route::apiResource('orders', OrderController::class);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/ai/ask', [AiController::class, 'ask']);
});