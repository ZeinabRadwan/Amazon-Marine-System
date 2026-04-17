<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ChatbotService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class ChatbotController extends Controller
{
    protected $chatbot;

    public function __construct(ChatbotService $chatbot)
    {
        $this->chatbot = $chatbot;
    }

    /**
     * POST /chatbot/ask
     */
    public function ask(Request $request)
    {
        $limit = (int) env('CHATBOT_RATE_LIMIT', 5);
        $window = (int) env('CHATBOT_RATE_WINDOW', 60);
        $userId = $request->user()->id;

        if (RateLimiter::tooManyAttempts('chatbot:'.$userId, $limit)) {
            return response()->json([
                'type' => 'error',
                'message' => 'Too many requests. Please wait a moment before asking again.'
            ], 429);
        }

        RateLimiter::hit('chatbot:'.$userId, $window);

        $request->validate([
            'message' => 'required|string|max:350',
            'locale' => 'nullable|string|max:10',
        ]);

        $message = $request->input('message');
        $locale = $request->input('locale', 'ar');
        
        // Final spam check/sanitization
        $message = strip_tags($message);
        
        $result = $this->chatbot->ask($message, $locale);

        return response()->json($result);
    }

    /**
     * GET /chatbot/prompts
     */
    public function prompts()
    {
        return response()->json([
            'prompts' => $this->chatbot->listPrompts()
        ]);
    }
}
