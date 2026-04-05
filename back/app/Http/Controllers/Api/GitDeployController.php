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
        $repoRoot = dirname(base_path());
        $publicHtml = dirname($repoRoot) . '/public_html';

        $command = "cd $repoRoot && git pull && " .
                   "rm -f $publicHtml/index.html && " .
                   "rm -rf $publicHtml/assets/* && " .
                   "cp $repoRoot/front/dist/index.html $publicHtml/index.html && " .
                   "cp -r $repoRoot/front/dist/assets/* $publicHtml/assets/";

        $result = Process::path($repoRoot)
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