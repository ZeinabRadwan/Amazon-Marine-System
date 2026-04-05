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
        $command = 'cd .. && git pull && ' .
                   'rm -f ../public_html/index.html && ' .
                   'rm -rf ../public_html/assets/* && ' .
                   'cp front/dist/index.html ../public_html/index.html && ' .
                   'cp -r front/dist/assets/* ../public_html/assets/';

        $result = Process::path(base_path())
            ->timeout(300)
            ->run($command);

        $payload = [
            'ok' => $result->successful(),
            'exit_code' => $result->exitCode(),
            'command' => $command,
            'output' => $result->output(),
            'error_output' => $result->errorOutput(),
        ];

        return response()->json($payload, $result->successful() ? 200 : 500);
    }
}