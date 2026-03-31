<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;


Route::get('/', function () {
    return view('welcome');
});

// create route for deploy:cloud
Route::get('/deploy', function () {
    // run the command deploy:cloud
    Artisan::call('git:pull');
    return response()->json([
        'message' => 'Deploy command executed successfully',
        'output' => Artisan::output(),
    ]);
});