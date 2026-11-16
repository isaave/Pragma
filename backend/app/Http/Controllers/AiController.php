<?php

namespace App\Http\Controllers;

use App\Ai\Agent;
use Illuminate\Http\Request;

class AiController extends Controller
{
    // Endpoint: POST /api/ai/ask  { question: "..." }
    public function ask(Request $request)
    {
        $data = $request->validate([
            'question' => 'required|string|max:1000',
        ]);

        $agent = new Agent();
        $result = $agent->ask(trim($data['question']));

        return response()->json($result);
    }
}
