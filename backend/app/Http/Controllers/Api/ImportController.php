<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\ImportServiceInterface;
use App\DTOs\ImportOptions;
use App\Http\Controllers\Controller;
use App\Http\Requests\ImportRequest;
use App\Models\Book;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportController extends Controller
{
    /** @var array<string, ImportServiceInterface> */
    private array $importServices = [];

    public function __construct(ImportServiceInterface ...$services)
    {
        foreach ($services as $service) {
            $this->importServices[$service->getProviderName()] = $service;
        }
    }

    public function import(ImportRequest $request): JsonResponse
    {
        $source = $request->validated('source');
        $file = $request->file('file');

        if (! isset($this->importServices[$source])) {
            return response()->json([
                'message' => "Import source '{$source}' is not supported.",
                'supported_sources' => array_keys($this->importServices),
            ], 422);
        }

        $service = $this->importServices[$source];
        $options = ImportOptions::fromRequest($request);
        $result = $service->import($request->user(), $file->path(), $options);

        return response()->json($result->toArray());
    }

    public function sources(): JsonResponse
    {
        $sources = [];

        foreach ($this->importServices as $name => $service) {
            $sources[] = [
                'name' => $name,
                'extensions' => $service->getSupportedExtensions(),
            ];
        }

        return response()->json($sources);
    }

    /**
     * Get the enrichment status for the user's library.
     *
     * Returns counts of books pending enrichment (missing cover/description)
     * so the mobile app can show progress after import.
     */
    public function enrichmentStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        $userBookIds = $user->userBooks()->pluck('book_id');

        $total = $userBookIds->count();

        $pendingEnrichment = Book::whereIn('id', $userBookIds)
            ->where(function ($query) {
                $query->where(function ($q) {
                    $q->whereNull('cover_path')
                        ->orWhere('cover_path', '');
                })
                    ->orWhere(function ($q) {
                        $q->whereNull('description')
                            ->orWhere('description', '');
                    });
            })
            ->count();

        $enriched = $total - $pendingEnrichment;

        return response()->json([
            'total' => $total,
            'enriched' => $enriched,
            'pending' => $pendingEnrichment,
            'progress' => $total > 0 ? round(($enriched / $total) * 100) : 100,
            'is_complete' => $pendingEnrichment === 0,
        ]);
    }
}
