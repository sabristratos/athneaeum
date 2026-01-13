<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Exception thrown when book search operations fail.
 *
 * Provides unified error handling with specific error codes and HTTP status mapping.
 */
class BookSearchException extends Exception
{
    public const RATE_LIMITED = 'RATE_LIMITED';

    public const CIRCUIT_OPEN = 'CIRCUIT_OPEN';

    public const SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE';

    public const INVALID_RESPONSE = 'INVALID_RESPONSE';

    private const HTTP_STATUS_MAP = [
        self::RATE_LIMITED => 429,
        self::CIRCUIT_OPEN => 503,
        self::SERVICE_UNAVAILABLE => 503,
        self::INVALID_RESPONSE => 502,
    ];

    private const DEFAULT_MESSAGES = [
        self::RATE_LIMITED => 'Too many requests. Please try again later.',
        self::CIRCUIT_OPEN => 'Book search service is temporarily unavailable due to repeated failures.',
        self::SERVICE_UNAVAILABLE => 'Book search service is temporarily unavailable. Please try again.',
        self::INVALID_RESPONSE => 'Received invalid response from book search service.',
    ];

    public function __construct(
        private string $errorCode,
        ?string $message = null,
        ?\Throwable $previous = null
    ) {
        $resolvedMessage = $message ?? self::DEFAULT_MESSAGES[$errorCode] ?? 'An error occurred';
        parent::__construct($resolvedMessage, 0, $previous);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getHttpStatus(): int
    {
        return self::HTTP_STATUS_MAP[$this->errorCode] ?? 500;
    }

    public static function rateLimited(?string $message = null): self
    {
        return new self(self::RATE_LIMITED, $message);
    }

    public static function circuitOpen(?string $message = null): self
    {
        return new self(self::CIRCUIT_OPEN, $message);
    }

    public static function serviceUnavailable(?string $message = null, ?\Throwable $previous = null): self
    {
        return new self(self::SERVICE_UNAVAILABLE, $message, $previous);
    }

    public static function invalidResponse(?string $message = null): self
    {
        return new self(self::INVALID_RESPONSE, $message);
    }
}
