<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Process;

class GitDeployController extends Controller
{
    /**
     * On-server deploy: pull repo (back + front from git), drop legacy ui/, publish front/dist to public_html.
     * Git lives in the repo root, not inside `back/`.
     */
    public function __invoke(): JsonResponse
    {
        $repoRoot = dirname(base_path());
        $publicHtml = dirname($repoRoot).'/public_html';
        $uiDir = $repoRoot.'/ui';
        $frontDist = $repoRoot.'/front/dist';

        $repoRootQ = escapeshellarg($repoRoot);
        $publicHtmlQ = escapeshellarg($publicHtml);
        $uiDirQ = escapeshellarg($uiDir);
        $frontDistQ = escapeshellarg($frontDist);

        // git pull updates back/ + front/ in the repo; ui/ is removed and never published.
        // rm -rf public_html/* clears visible entries; find removes any remainder (e.g. dotfiles).
        $command = "cd {$repoRootQ} && git pull && ".
            "rm -rf {$uiDirQ} && ".
            "rm -rf {$publicHtmlQ}/* && ".
            "find {$publicHtmlQ} -mindepth 1 -delete 2>/dev/null || true && ".
            "cp -r {$frontDistQ}/* {$publicHtmlQ}/";

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
