<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LlmProviderService
{
    protected $provider;
    protected $model;
    protected $geminiKey;
    protected $openaiKey;

    public function __construct()
    {
        $this->provider = env('CHATBOT_LLM_PROVIDER', 'gemini');
        $this->model = env('CHATBOT_LLM_MODEL', 'gemini-2.0-flash');
        $this->geminiKey = env('CHATBOT_GEMINI_API_KEY');
        $this->openaiKey = env('CHATBOT_OPENAI_API_KEY');
    }

    public function generate(string $systemPrompt, string $userMessage): ?string
    {
        if ($this->provider === 'gemini') {
            return $this->callGemini($systemPrompt, $userMessage);
        }

        if ($this->provider === 'openai') {
            return $this->callOpenAI($systemPrompt, $userMessage);
        }

        return null;
    }

    protected function callGemini(string $systemPrompt, string $userMessage): ?string
    {
        if (empty($this->geminiKey)) {
            Log::error('Chatbot: Gemini API key is missing.');
            return null;
        }

        // Gemini Flash endpoint
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent";

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'X-goog-api-key' => $this->geminiKey,
        ])->post($url, [
            'contents' => [
                [
                    'parts' => [
                        ['text' => "Instructions: {$systemPrompt}\n\nUser Question: {$userMessage}"]
                    ]
                ]
            ],
            'generationConfig' => [
                'maxOutputTokens' => 1024,
                'temperature' => 0.1,
                'responseMimeType' => 'application/json',
            ]
        ]);

        if ($response->failed()) {
            Log::error('Chatbot: Gemini API call failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        }

        $data = $response->json();
        // The model is instructed to return JSON, which Gemini usually wraps in its response
        return $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
    }

    protected function callOpenAI(string $systemPrompt, string $userMessage): ?string
    {
        Log::warning('Chatbot: OpenAI provider is not yet implemented.');
        return null;
    }
}
