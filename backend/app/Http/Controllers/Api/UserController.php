<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateThemeRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function updateTheme(UpdateThemeRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['theme' => $request->validated('theme')]);

        return response()->json(new UserResource($user));
    }
}
