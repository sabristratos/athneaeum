<?php

use App\Jobs\SyncNYTBestsellersJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('stats:update-streaks')->dailyAt('00:05');

Schedule::command('stats:archive-month')->monthlyOn(1, '00:30');

Schedule::command('stats:recalculate --all')->weeklyOn(0, '03:00');

Schedule::job(new SyncNYTBestsellersJob)->weeklyOn(0, '06:00');
