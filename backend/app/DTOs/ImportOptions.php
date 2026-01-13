<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Http\Requests\ImportRequest;

class ImportOptions
{
    public function __construct(
        public bool $enrichmentEnabled = true,
        public bool $importTags = true,
        public bool $importReviews = true,
    ) {}

    public static function fromRequest(ImportRequest $request): self
    {
        return new self(
            enrichmentEnabled: $request->boolean('enrichment_enabled', true),
            importTags: $request->boolean('import_tags', true),
            importReviews: $request->boolean('import_reviews', true),
        );
    }
}
