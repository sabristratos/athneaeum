<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'source' => ['required', 'string', 'in:goodreads,storygraph'],
            'enrichment_enabled' => ['boolean'],
            'import_tags' => ['boolean'],
            'import_reviews' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'The import file must not exceed 10MB.',
            'file.mimes' => 'The import file must be a CSV file.',
            'source.in' => 'The import source must be goodreads or storygraph.',
        ];
    }
}
