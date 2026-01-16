<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send a silent push notification to trigger sync.
     */
    public function sendSyncNotification(string $pushToken, string $type = 'sync', array $data = []): bool
    {
        if (empty($pushToken)) {
            return false;
        }

        return $this->send($pushToken, [
            '_contentAvailable' => true,
            'data' => [
                'type' => $type,
                ...$data,
            ],
        ]);
    }

    /**
     * Send a notification when book classification completes.
     */
    public function sendClassificationComplete(string $pushToken, int $bookId): bool
    {
        return $this->sendSyncNotification($pushToken, 'classification_complete', [
            'book_id' => $bookId,
        ]);
    }

    /**
     * Send a push notification via Expo's push service.
     */
    public function send(string $pushToken, array $message): bool
    {
        if (! str_starts_with($pushToken, 'ExponentPushToken[') && ! str_starts_with($pushToken, 'ExpoPushToken[')) {
            Log::warning('Invalid Expo push token format', ['token' => substr($pushToken, 0, 20).'...']);

            return false;
        }

        try {
            $payload = [
                'to' => $pushToken,
                'sound' => null,
                'priority' => 'high',
                ...$message,
            ];

            $response = Http::timeout(10)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post(self::EXPO_PUSH_URL, $payload);

            if (! $response->successful()) {
                Log::error('Expo push failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            $data = $response->json('data');
            if (isset($data['status']) && $data['status'] === 'error') {
                Log::warning('Expo push error', [
                    'message' => $data['message'] ?? 'Unknown error',
                    'details' => $data['details'] ?? null,
                ]);

                return false;
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Expo push exception', [
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
