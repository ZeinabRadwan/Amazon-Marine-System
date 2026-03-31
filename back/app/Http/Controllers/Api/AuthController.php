<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PagePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

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

    public function uploadProfileAvatar(Request $request)
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
        $oldPath = $user->avatar;

        $path = $file->store('avatars', 'public');

        $user->avatar = $path;
        $user->save();

        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'user' => $this->transformUser($user->fresh()),
        ]);
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
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'initials' => $user->initials,
            'status' => $user->status,
            'timezone' => $user->timezone,
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar ? (request()->getSchemeAndHttpHost().'/storage/'.ltrim($user->avatar, '/')) : null,
            'roles' => $user->getRoleNames(),
            'role_id' => $user->roles->first()?->id,
        ];
    }
}
