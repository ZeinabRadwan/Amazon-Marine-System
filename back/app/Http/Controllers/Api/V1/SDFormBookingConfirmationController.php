<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SDForm;
use App\Models\SDFormBookingConfirmation;
use App\Models\User;
use App\Notifications\SdFormBookingConfirmationUploadedNotification;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class SDFormBookingConfirmationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    public function sdFormOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && ($user->hasRole('admin') || $user->hasRole('operations')), 403);

        $limit = min(max((int) $request->query('per_page', 1500), 1), 2000);

        $rows = SDForm::query()
            ->with(['client:id,company_name,name'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get(['id', 'sd_number', 'client_id']);

        return response()->json([
            'data' => $rows->map(fn (SDForm $f) => [
                'id' => $f->id,
                'sd_number' => $f->sd_number,
                'client_id' => $f->client_id,
                'client' => $f->client,
            ]),
        ]);
    }

    public function index(Request $request, SDForm $sdForm): JsonResponse
    {
        $this->authorizeViewBookingFiles($request->user(), $sdForm);

        $rows = $sdForm->bookingConfirmations()
            ->with('uploadedBy:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $rows->map(fn (SDFormBookingConfirmation $c) => $this->payload($request, $sdForm, $c)),
        ]);
    }

    public function store(Request $request, SDForm $sdForm): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->can('uploadBookingConfirmation', $sdForm), 403);

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv,txt,zip,rar,ppt,pptx', 'max:10240'],
        ]);

        $file = $request->file('file');
        $path = $file->store('sd-form-booking-confirmations/'.$sdForm->id, 'local');

        $confirmation = $sdForm->bookingConfirmations()->create([
            'uploaded_by_user_id' => $user->id,
            'name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        ActivityLogger::log('sd_form.booking_confirmation_uploaded', $sdForm, [
            'sd_form_booking_confirmation_id' => $confirmation->id,
            'file_name' => $confirmation->name,
        ]);

        $recipients = $this->recipientsForBookingUploadNotification($user);
        if ($recipients->isNotEmpty()) {
            $this->notificationService->sendDatabaseNotification(
                'sd_form.booking_confirmation_uploaded',
                $sdForm,
                $recipients,
                new SdFormBookingConfirmationUploadedNotification($sdForm, $confirmation)
            );
        }

        return response()->json([
            'data' => $this->payload($request, $sdForm, $confirmation->fresh(['uploadedBy:id,name'])),
        ], 201);
    }

    public function download(Request $request, SDForm $sdForm, int|string $confirmation): mixed
    {
        $this->authorizeViewBookingFiles($request->user(), $sdForm);

        $row = SDFormBookingConfirmation::query()
            ->where('sd_form_id', $sdForm->id)
            ->whereKey((int) $confirmation)
            ->firstOrFail();

        $fullPath = $this->resolveFilesystemPath($row);
        if ($fullPath === null) {
            abort(404, __('File not found.'));
        }

        return response()->download($fullPath, $row->name, [
            'Content-Type' => $row->mime_type ?? 'application/octet-stream',
        ]);
    }

    private function authorizeViewBookingFiles(?User $user, SDForm $sdForm): void
    {
        abort_unless($user, 403);
        if ($user->can('uploadBookingConfirmation', $sdForm) || $user->can('view', $sdForm)) {
            return;
        }
        abort(403);
    }

    /**
     * @return Collection<int, User>
     */
    private function recipientsForBookingUploadNotification(User $uploader): Collection
    {
        $adminIds = User::role('admin')->pluck('id');
        $salesIds = User::role('sales')->pluck('id');
        $ids = $adminIds->merge($salesIds)->unique()->values()->filter(fn ($id) => (int) $id !== (int) $uploader->id);

        if ($ids->isEmpty()) {
            return collect();
        }

        return User::query()->whereIn('id', $ids)->get();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Request $request, SDForm $sdForm, SDFormBookingConfirmation $c): array
    {
        return [
            'id' => $c->id,
            'sd_form_id' => $c->sd_form_id,
            'name' => $c->name,
            'url' => $this->downloadUrl($request, $sdForm, $c),
            'mime_type' => $c->mime_type,
            'size' => $c->size,
            'created_at' => $c->created_at?->toIso8601String(),
            'uploaded_by' => $c->relationLoaded('uploadedBy') && $c->uploadedBy
                ? ['id' => $c->uploadedBy->id, 'name' => $c->uploadedBy->name]
                : null,
        ];
    }

    private function downloadUrl(Request $request, SDForm $sdForm, SDFormBookingConfirmation $c): string
    {
        $base = $request->getSchemeAndHttpHost();

        return $base.'/api/v1/sd-forms/'.$sdForm->id.'/booking-confirmations/'.$c->id.'/download';
    }

    private function resolveFilesystemPath(SDFormBookingConfirmation $attachment): ?string
    {
        $relative = $attachment->path;
        if ($relative === '' || str_contains($relative, '..')) {
            return null;
        }

        $primary = Storage::disk('local')->path($relative);
        if (is_file($primary)) {
            return $primary;
        }

        return null;
    }
}
