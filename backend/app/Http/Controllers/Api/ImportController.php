<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Contracts\ImportServiceInterface;
use App\DTOs\ImportOptions;
use App\Http\Controllers\Controller;
use App\Http\Requests\ImportRequest;
use Illuminate\Http\JsonResponse;

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
}
