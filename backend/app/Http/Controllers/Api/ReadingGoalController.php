<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\GoalPeriodEnum;
use App\Enums\GoalTypeEnum;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReadingGoalResource;
use App\Models\ReadingGoal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingGoalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $goals = $request->user()
            ->readingGoals()
            ->active()
            ->orderBy('period')
            ->orderBy('type')
            ->get();

        return response()->json(ReadingGoalResource::collection($goals));
    }

    public function show(Request $request, ReadingGoal $goal): JsonResponse
    {
        if ($goal->user_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json(new ReadingGoalResource($goal));
    }

    public function types(): JsonResponse
    {
        return response()->json(GoalTypeEnum::options());
    }

    public function periods(): JsonResponse
    {
        return response()->json(GoalPeriodEnum::options());
    }
}
