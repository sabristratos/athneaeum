<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;

class DeleteAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! Hash::check($this->password, $this->user()->password)) {
                $validator->errors()->add('password', __('The password is incorrect.'));
            }
        });
    }

    public function messages(): array
    {
        return [
            'password.required' => __('Please enter your password to confirm account deletion.'),
        ];
    }
}
