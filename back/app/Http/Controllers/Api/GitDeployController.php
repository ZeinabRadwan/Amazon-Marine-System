<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Process;

class GitDeployController extends Controller
{
    /**
     * Git lives in the repo root, not inside `back/`. Run from Laravel root: `cd ..` then `git pull`.
     */
    public function __invoke(): JsonResponse
    {
        $result = Process::path(base_path())
            ->timeout(120)
            ->run('cd .. && git pull');

        $payload = [
            'ok' => $result->successful(),
            'exit_code' => $result->exitCode(),
            'output' => $result->output(),
            'error_output' => $result->errorOutput(),
        ];

        return response()->json($payload, $result->successful() ? 200 : 500);
    }
}