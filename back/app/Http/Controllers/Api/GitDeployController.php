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
        // Do NOT wipe public_html — only replace index.html + assets, then copy dist (cp -a includes
        // hidden files: .htaccess for Apache SPA fallback, web.config for IIS if present in dist).
        $command = "cd {$repoRootQ} && git pull && ".
            "rm -rf {$uiDirQ} && ".
            "rm -f {$publicHtmlQ}/index.html && ".
            "rm -rf {$publicHtmlQ}/assets && ".
            "cp -a {$frontDistQ}/. {$publicHtmlQ}/";

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
