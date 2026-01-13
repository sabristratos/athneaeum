<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\GoalPeriodEnum;
use App\Enums\GoalTypeEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReadingGoal\StoreReadingGoalRequest;
use App\Http\Requests\ReadingGoal\UpdateReadingGoalRequest;
use App\Http\Resources\ReadingGoalResource;
use App\Models\ReadingGoal;
use App\Services\Goals\ReadingGoalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingGoalController extends Controller
{
    public function __construct(
        private ReadingGoalService $goalService
    ) {}

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

    public function store(StoreReadingGoalRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $existingGoal = $user->readingGoals()
            ->where('type', $data['type'])
            ->where('period', $data['period'])
            ->where('year', $data['year'])
            ->when(
                $data['period'] === GoalPeriodEnum::Monthly->value,
                fn ($q) => $q->where('month', $data['month'] ?? now()->month)
            )
            ->when(
                $data['period'] === GoalPeriodEnum::Weekly->value,
                fn ($q) => $q->where('week', $data['week'] ?? now()->week)
            )
            ->active()
            ->first();

        if ($existingGoal) {
            $existingGoal->update([
                'target' => $data['target'],
            ]);

            return response()->json(new ReadingGoalResource($existingGoal));
        }

        $goal = $user->readingGoals()->create([
            'type' => $data['type'],
            'period' => $data['period'],
            'target' => $data['target'],
            'current_value' => 0,
            'year' => $data['year'],
            'month' => $data['month'] ?? ($data['period'] === GoalPeriodEnum::Monthly->value ? now()->month : null),
            'week' => $data['week'] ?? ($data['period'] === GoalPeriodEnum::Weekly->value ? now()->week : null),
            'is_active' => true,
        ]);

        return response()->json(new ReadingGoalResource($goal), 201);
    }

    public function show(Request $request, ReadingGoal $goal): JsonResponse
    {
        if ($goal->user_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json(new ReadingGoalResource($goal));
    }

    public function update(UpdateReadingGoalRequest $request, ReadingGoal $goal): JsonResponse
    {
        $goal->update($request->validated());

        return response()->json(new ReadingGoalResource($goal));
    }

    public function destroy(Request $request, ReadingGoal $goal): JsonResponse
    {
        if ($goal->user_id !== $request->user()->id) {
            abort(403);
        }

        $goal->delete();

        return response()->json(['message' => __('Goal deleted successfully.')]);
    }

    public function types(): JsonResponse
    {
        return response()->json(GoalTypeEnum::options());
    }

    public function periods(): JsonResponse
    {
        return response()->json(GoalPeriodEnum::options());
    }

    /**
     * Recalculate all goals based on actual reading data.
     */
    public function recalculate(Request $request): JsonResponse
    {
        $this->goalService->recalculateAllGoals($request->user());

        $goals = $request->user()
            ->readingGoals()
            ->active()
            ->orderBy('period')
            ->orderBy('type')
            ->get();

        return response()->json(ReadingGoalResource::collection($goals));
    }
}
