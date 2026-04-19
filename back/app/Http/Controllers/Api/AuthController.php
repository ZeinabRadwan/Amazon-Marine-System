<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PagePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use App\Services\FileService;

class AuthController extends Controller
{
    /**
     * @return array{page_access: array<int, string>, page_access_count: int, page_access_version: string}
     */
    private function pageAccessPayload(User $user): array
    {
        $allPagesInOrder = array_keys(config('permissions.pages', []));

        $roleNames = $user->getRoleNames()->map(fn ($n) => strtolower((string) $n))->values();
        if ($roleNames->contains('admin')) {
            $version = sha1(json_encode([
                'admin',
                $allPagesInOrder,
            ], JSON_THROW_ON_ERROR));

            return [
                'page_access' => $allPagesInOrder,
                'page_access_count' => count($allPagesInOrder),
                'page_access_version' => $version,
            ];
        }

        $roleIds = $user->roles()->pluck('id')->map(fn ($id) => (int) $id)->values();

        if ($roleIds->isEmpty()) {
            $version = sha1(json_encode(['no_roles'], JSON_THROW_ON_ERROR));

            return [
                'page_access' => [],
                'page_access_count' => 0,
                'page_access_version' => $version,
            ];
        }

        $allowedPagesSet = PagePermission::query()
            ->whereIn('role_id', $roleIds)
            ->where('can_view', true)
            ->pluck('page')
            ->map(fn ($p) => (string) $p)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $allowedPages = array_values(array_filter($allPagesInOrder, fn (string $p) => in_array($p, $allowedPagesSet, true)));

        $maxUpdatedAt = PagePermission::query()
            ->whereIn('role_id', $roleIds)
            ->max('updated_at');

        $roleIdsSorted = $roleIds->sort()->values()->all();
        $version = sha1(json_encode([
            'role_ids' => $roleIdsSorted,
            'pages' => $allowedPages,
            'max_updated_at' => $maxUpdatedAt,
        ], JSON_THROW_ON_ERROR));

        return [
            'page_access' => $allowedPages,
            'page_access_count' => count($allowedPages),
            'page_access_version' => $version,
        ];
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => [__('The provided credentials are incorrect.')],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user->status !== 'active') {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => [__('Your account has been deactivated. Please contact an administrator.')],
            ]);
        }

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->transformUser($user),
            'role' => $user->getRoleNames()->first(),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            ...$this->pageAccessPayload($user),
        ]);
    }

    public function logout(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json(['message' => __('Logged out')]);
    }

    public function me(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->transformUser($user),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            ...$this->pageAccessPayload($user),
        ]);
    }

    public function profile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->transformUser($user),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            ...$this->pageAccessPayload($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'timezone' => ['sometimes', 'nullable', 'timezone:all'],
            'current_password' => ['sometimes', 'required_with:password,password_confirmation', 'string'],
            'password' => ['sometimes', 'required_with:current_password', 'string', 'min:8', 'confirmed'],
        ]);

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }

        if (array_key_exists('timezone', $validated)) {
            $user->timezone = $validated['timezone'];
        }

        if (array_key_exists('password', $validated)) {
            if (empty($validated['current_password']) || ! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => [__('The current password is incorrect.')],
                ]);
            }

            $user->password = $validated['password'];
        }

        $user->save();

        return response()->json([
            'user' => $this->transformUser($user),
        ]);
    }

    public function uploadProfileAvatar(Request $request, FileService $fileService)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ], [
            'avatar.required' => __('Please select an image to upload.'),
            'avatar.image' => __('The file must be an image.'),
            'avatar.mimes' => __('The avatar must be a file of type: jpg, jpeg, png.'),
            'avatar.max' => __('The avatar may not be greater than 2 megabytes.'),
        ]);

        $file = $request->file('avatar');

        try {
            DB::beginTransaction();

            // 1. Upload the new avatar
            $newFile = $fileService->upload(
                file: $file,
                collection: 'avatars',
                owner: $user
            );

            // 2. Clear legacy column
            $oldLegacyPath = $user->avatar;
            $user->avatar = null;
            $user->save();

            DB::commit();

            // 3. Clean up old records and files AFTER successful DB commit
            // This is "best effort" cleanup
            try {
                $oldAvatars = $user->files()
                    ->where('collection', 'avatars')
                    ->where('id', '!=', $newFile->id)
                    ->get();
                
                foreach ($oldAvatars as $oldAvatar) {
                    $fileService->delete($oldAvatar);
                }

                if ($oldLegacyPath && Storage::disk('public')->exists($oldLegacyPath)) {
                    Storage::disk('public')->delete($oldLegacyPath);
                }
            } catch (\Exception $cleanupEx) {
                // Log cleanup failure but don't fail the upload
                \Illuminate\Support\Facades\Log::warning("Avatar cleanup failed for user {$user->id}: " . $cleanupEx->getMessage());
            }

            return response()->json([
                'user' => $this->transformUser($user->fresh()),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => __('Failed to upload avatar. Please try again.'),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updatePassword(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => [__('The current password is incorrect.')],
            ]);
        }

        $user->password = $validated['password'];
        $user->save();

        return response()->json([
            'user' => $this->transformUser($user),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function transformUser(User $user): array
    {
        $avatarRecord = $user->files()->where('collection', 'avatars')->latest()->first();
        $avatarUrl = $avatarRecord ? $avatarRecord->getUrl() : ($user->avatar ? (request()->getSchemeAndHttpHost().'/storage/'.ltrim($user->avatar, '/')) : null);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'initials' => $user->initials,
            'status' => $user->status,
            'timezone' => $user->timezone,
            'avatar' => $user->avatar,
            'avatar_url' => $avatarUrl,
            'roles' => $user->getRoleNames(),
            'role_id' => $user->roles->first()?->id,
        ];
    }
}
