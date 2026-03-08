<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user->status !== 'active') {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Please contact an administrator.'],
            ]);
        }

        $token = $user->createToken('spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->transformUser($user),
            'role' => $user->getRoleNames()->first(),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function logout(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->transformUser($user),
        ]);
    }

    public function profile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->transformUser($user),
        ]);
    }

    public function updateProfile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'current_password' => ['sometimes', 'required_with:password,password_confirmation', 'string'],
            'password' => ['sometimes', 'required_with:current_password', 'string', 'min:8', 'confirmed'],
        ]);

        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }

        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }

        if (array_key_exists('password', $validated)) {
            if (empty($validated['current_password']) || ! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The current password is incorrect.'],
                ]);
            }

            $user->password = $validated['password'];
        }

        $user->save();

        return response()->json([
            'user' => $this->transformUser($user),
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
                'current_password' => ['The current password is incorrect.'],
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
            'roles' => $user->getRoleNames(),
        ];
    }
}

