<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Http;

// Manually test the ranking algorithm to see scores
$workKey = 'OL82548W';
$response = Http::withHeaders(['User-Agent' => 'Athenaeum/1.0'])
    ->get("https://openlibrary.org/works/{$workKey}/editions.json", ['limit' => 100]);

$editions = $response->json()['entries'] ?? [];

$premiumPublishers = [
    'scholastic' => 200,
    'random house' => 180,
    'penguin' => 170,
];

$goodPublishers = [
    'bloomsbury' => 70,
];

$candidates = [];

foreach ($editions as $edition) {
    $covers = $edition['covers'] ?? [];
    if (empty($covers) || $covers[0] <= 0) continue;

    $coverId = $covers[0];
    $publisher = strtolower($edition['publishers'][0] ?? '');
    $year = null;
    if (preg_match('/\b(19|20)\d{2}\b/', $edition['publish_date'] ?? '', $m)) {
        $year = (int)$m[0];
    }

    $score = 0;

    // Publisher scoring
    foreach ($premiumPublishers as $name => $bonus) {
        if (str_contains($publisher, $name)) {
            $score += $bonus;
            break;
        }
    }
    if ($score === 0) {
        foreach ($goodPublishers as $name => $bonus) {
            if (str_contains($publisher, $name)) {
                $score += $bonus;
                break;
            }
        }
    }

    // ISBN
    if (!empty($edition['isbn_13'])) $score += 40;
    elseif (!empty($edition['isbn_10'])) $score += 30;

    // Language (small boost)
    foreach ($edition['languages'] ?? [] as $lang) {
        if (str_contains($lang['key'] ?? '', '/eng')) {
            $score += 5;
            break;
        }
    }

    // Multiple covers
    if (count($covers) > 1) $score += 10;

    // Year preference (first editions get big boost)
    if ($year) {
        if ($year >= 2000 && $year <= 2005) $score += 50;
        elseif ($year >= 1990 && $year <= 1999) $score += 45;
        elseif ($year >= 2006 && $year <= 2010) $score += 25;
        elseif ($year >= 2011 && $year <= 2015) $score += 10;
    }

    if (str_contains($publisher, 'scholastic')) {
        $candidates[] = [
            'cover_id' => $coverId,
            'publisher' => $publisher,
            'year' => $year,
            'score' => $score,
        ];
    }
}

usort($candidates, fn($a, $b) => $b['score'] <=> $a['score']);

echo "Top 5 Scholastic editions by score:\n\n";
foreach (array_slice($candidates, 0, 5) as $c) {
    // Check actual image size
    $url = "https://covers.openlibrary.org/b/id/{$c['cover_id']}-L.jpg";
    $headers = get_headers($url, true);
    $size = $headers['Content-Length'] ?? 'unknown';
    echo "Cover ID: {$c['cover_id']}, Year: {$c['year']}, Score: {$c['score']}, Size: {$size} bytes\n";
}
