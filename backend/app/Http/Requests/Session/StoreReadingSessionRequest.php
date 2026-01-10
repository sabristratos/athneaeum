<?php

declare(strict_types=1);

namespace App\Http\Requests\Session;

use App\Models\UserBook;
use Illuminate\Foundation\Http\FormRequest;

class StoreReadingSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $userBook = UserBook::find($this->input('user_book_id'));

        return $userBook && $userBook->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'user_book_id' => ['required', 'exists:user_books,id'],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'start_page' => ['required', 'integer', 'min:0'],
            'end_page' => ['required', 'integer', 'gt:start_page'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
