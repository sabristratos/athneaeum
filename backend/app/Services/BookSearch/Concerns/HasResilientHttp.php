<?php

declare(strict_types=1);

namespace App\Services\BookSearch\Concerns;

use App\Exceptions\BookSearchException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Provides resilient HTTP request handling for book search services.
 *
 * Features:
 * - Rate limiting enforcement
 * - Circuit breaker pattern
 * - Retry with exponential backoff
 * - Consistent error handling
 */
trait HasResilientHttp
{
    /**
     * Execute a request with full resilience (rate limiting, circuit breaker, retry).
     *
     * @param  callable  $requestFn  Function that performs the HTTP request and returns Response|mixed
     *
     * @throws BookSearchException
     */
    protected function makeResilientRequest(
        string $rateLimiterKey,
        string $circuitBreakerKey,
        callable $requestFn
    ): mixed {
        $this->checkRateLimit($rateLimiterKey);
        $this->checkCircuitBreaker($circuitBreakerKey);

        return $this->executeWithRetry($circuitBreakerKey, $requestFn);
    }

    /**
     * Check if rate limit is exceeded.
     *
     * @throws BookSearchException When rate limit is exceeded
     */
    protected function checkRateLimit(string $key): void
    {
        $maxAttempts = $this->getRateLimitMaxAttempts($key);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            Log::warning('Rate limit exceeded for book search', [
                'key' => $key,
                'retry_after' => $seconds,
            ]);

            throw BookSearchException::rateLimited(
                "Rate limit exceeded. Please try again in {$seconds} seconds."
            );
        }

        RateLimiter::hit($key, 60);
    }

    /**
     * Get max attempts for a rate limiter key.
     */
    protected function getRateLimitMaxAttempts(string $key): int
    {
        return match ($key) {
            'google-books-api' => 30,
            'opds-api' => 60,
            default => 30,
        };
    }

    /**
     * Check if circuit breaker is open.
     *
     * @throws BookSearchException When circuit is open
     */
    protected function checkCircuitBreaker(string $key): void
    {
        $state = $this->getCircuitState($key);

        if ($state === 'open') {
            $decaySeconds = config('services.book_search.circuit_breaker_decay_seconds', 60);
            $openedAt = Cache::get("circuit:{$key}:opened_at", 0);
            $elapsed = time() - $openedAt;

            if ($elapsed < $decaySeconds) {
                Log::info('Circuit breaker is open, failing fast', [
                    'key' => $key,
                    'retry_after' => $decaySeconds - $elapsed,
                ]);

                throw BookSearchException::circuitOpen();
            }

            $this->setCircuitState($key, 'half-open');
        }
    }

    /**
     * Execute a request with retry logic and exponential backoff.
     *
     * @throws BookSearchException On final failure
     */
    protected function executeWithRetry(string $circuitBreakerKey, callable $requestFn): mixed
    {
        $maxAttempts = config('services.book_search.retry_attempts', 3);
        $baseDelayMs = config('services.book_search.retry_delay_ms', 500);
        $lastException = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $result = $requestFn();

                if ($result instanceof Response) {
                    if ($result->successful()) {
                        $this->recordSuccess($circuitBreakerKey);

                        return $result;
                    }

                    if ($this->isRetryable($result->status())) {
                        $lastException = new \RuntimeException(
                            "HTTP {$result->status()}: {$result->body()}"
                        );

                        if ($attempt < $maxAttempts) {
                            $this->sleep($baseDelayMs * $attempt);

                            continue;
                        }
                    } else {
                        $this->recordFailure($circuitBreakerKey);

                        throw BookSearchException::serviceUnavailable(
                            "Request failed with status {$result->status()}"
                        );
                    }
                }

                $this->recordSuccess($circuitBreakerKey);

                return $result;
            } catch (ConnectionException $e) {
                $lastException = $e;

                Log::warning('Connection failed, retrying', [
                    'attempt' => $attempt,
                    'max_attempts' => $maxAttempts,
                    'error' => $e->getMessage(),
                ]);

                if ($attempt < $maxAttempts) {
                    $this->sleep($baseDelayMs * $attempt);
                }
            } catch (RequestException $e) {
                $lastException = $e;

                if ($this->isRetryable($e->response?->status() ?? 500)) {
                    Log::warning('Request failed, retrying', [
                        'attempt' => $attempt,
                        'status' => $e->response?->status(),
                        'error' => $e->getMessage(),
                    ]);

                    if ($attempt < $maxAttempts) {
                        $this->sleep($baseDelayMs * $attempt);
                    }
                } else {
                    break;
                }
            }
        }

        $this->recordFailure($circuitBreakerKey);

        Log::error('All retry attempts exhausted', [
            'key' => $circuitBreakerKey,
            'attempts' => $maxAttempts,
            'error' => $lastException?->getMessage(),
        ]);

        throw BookSearchException::serviceUnavailable(
            'Book search service is temporarily unavailable. Please try again.',
            $lastException
        );
    }

    /**
     * Check if an HTTP status code is retryable.
     */
    protected function isRetryable(int $status): bool
    {
        return $status === 429 || $status >= 500;
    }

    /**
     * Record a successful request (resets circuit breaker).
     */
    protected function recordSuccess(string $key): void
    {
        $state = $this->getCircuitState($key);

        if ($state === 'half-open') {
            $this->setCircuitState($key, 'closed');
            Cache::forget("circuit:{$key}:failures");
            Cache::forget("circuit:{$key}:opened_at");

            Log::info('Circuit breaker closed after successful request', ['key' => $key]);
        } elseif ($state === 'closed') {
            Cache::forget("circuit:{$key}:failures");
        }
    }

    /**
     * Record a failed request (may trip circuit breaker).
     */
    protected function recordFailure(string $key): void
    {
        $threshold = config('services.book_search.circuit_breaker_threshold', 5);
        $decaySeconds = config('services.book_search.circuit_breaker_decay_seconds', 60);

        $failures = Cache::increment("circuit:{$key}:failures");

        if ($failures === 1) {
            Cache::put("circuit:{$key}:failures", 1, $decaySeconds);
        }

        if ($failures >= $threshold) {
            $this->setCircuitState($key, 'open');
            Cache::put("circuit:{$key}:opened_at", time(), $decaySeconds * 2);

            Log::warning('Circuit breaker opened due to failures', [
                'key' => $key,
                'failures' => $failures,
                'threshold' => $threshold,
            ]);
        }
    }

    /**
     * Get circuit breaker state.
     */
    protected function getCircuitState(string $key): string
    {
        return Cache::get("circuit:{$key}:state", 'closed');
    }

    /**
     * Set circuit breaker state.
     */
    protected function setCircuitState(string $key, string $state): void
    {
        $decaySeconds = config('services.book_search.circuit_breaker_decay_seconds', 60);
        Cache::put("circuit:{$key}:state", $state, $decaySeconds * 2);
    }

    /**
     * Sleep for a given number of milliseconds.
     */
    protected function sleep(int $milliseconds): void
    {
        usleep($milliseconds * 1000);
    }

    /**
     * Get the configured timeout in seconds.
     */
    protected function getTimeout(): int
    {
        return config('services.book_search.timeout', 15);
    }
}
