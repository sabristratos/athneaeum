<?php

declare(strict_types=1);

use App\Enums\GenreEnum;

/*
|--------------------------------------------------------------------------
| Genre Mappings Configuration
|--------------------------------------------------------------------------
|
| Maps external genre strings to canonical GenreEnum values.
| These mappings are used by the GenreCleaner in Level 1 processing.
|
| Format: 'normalized_external_genre' => 'canonical_enum_value'
|
*/

return [
    /*
    |--------------------------------------------------------------------------
    | Global Mappings (apply to all sources)
    |--------------------------------------------------------------------------
    */
    'global' => [
        // Generic fallbacks (when no specific genre available)
        'fiction' => GenreEnum::Literary->value,
        'nonfiction' => GenreEnum::Science->value,
        'non-fiction' => GenreEnum::Science->value,

        // Science Fiction variants
        'science fiction' => GenreEnum::ScienceFiction->value,
        'sci-fi' => GenreEnum::ScienceFiction->value,
        'scifi' => GenreEnum::ScienceFiction->value,
        'sf' => GenreEnum::ScienceFiction->value,
        'space opera' => GenreEnum::ScienceFiction->value,
        'cyberpunk' => GenreEnum::ScienceFiction->value,
        'dystopian' => GenreEnum::ScienceFiction->value,
        'post-apocalyptic' => GenreEnum::ScienceFiction->value,
        'hard science fiction' => GenreEnum::ScienceFiction->value,
        'military science fiction' => GenreEnum::ScienceFiction->value,
        'time travel' => GenreEnum::ScienceFiction->value,
        'alien contact' => GenreEnum::ScienceFiction->value,
        'science fiction & fantasy' => GenreEnum::ScienceFiction->value,

        // Fantasy variants
        'fantasy' => GenreEnum::Fantasy->value,
        'epic fantasy' => GenreEnum::Fantasy->value,
        'high fantasy' => GenreEnum::Fantasy->value,
        'urban fantasy' => GenreEnum::Fantasy->value,
        'dark fantasy' => GenreEnum::Fantasy->value,
        'sword and sorcery' => GenreEnum::Fantasy->value,
        'paranormal' => GenreEnum::Fantasy->value,
        'paranormal romance' => GenreEnum::Fantasy->value,
        'magical realism' => GenreEnum::Fantasy->value,
        'fairy tales' => GenreEnum::Fantasy->value,
        'mythology' => GenreEnum::Fantasy->value,

        // Mystery variants
        'mystery' => GenreEnum::Mystery->value,
        'mysteries' => GenreEnum::Mystery->value,
        'detective' => GenreEnum::Mystery->value,
        'detective fiction' => GenreEnum::Mystery->value,
        'cozy mystery' => GenreEnum::Mystery->value,
        'cozy mysteries' => GenreEnum::Mystery->value,
        'whodunit' => GenreEnum::Mystery->value,
        'police procedural' => GenreEnum::Mystery->value,
        'noir' => GenreEnum::Mystery->value,
        'hardboiled' => GenreEnum::Mystery->value,

        // Thriller variants
        'thriller' => GenreEnum::Thriller->value,
        'thrillers' => GenreEnum::Thriller->value,
        'suspense' => GenreEnum::Thriller->value,
        'psychological thriller' => GenreEnum::Thriller->value,
        'legal thriller' => GenreEnum::Thriller->value,
        'medical thriller' => GenreEnum::Thriller->value,
        'techno-thriller' => GenreEnum::Thriller->value,
        'spy thriller' => GenreEnum::Thriller->value,
        'espionage' => GenreEnum::Thriller->value,
        'action thriller' => GenreEnum::Thriller->value,

        // Romance variants
        'romance' => GenreEnum::Romance->value,
        'contemporary romance' => GenreEnum::Romance->value,
        'historical romance' => GenreEnum::Romance->value,
        'romantic suspense' => GenreEnum::Romance->value,
        'romantic comedy' => GenreEnum::Romance->value,
        'rom-com' => GenreEnum::Romance->value,
        'chick lit' => GenreEnum::Romance->value,
        'love story' => GenreEnum::Romance->value,
        'erotica' => GenreEnum::Romance->value,
        'erotic romance' => GenreEnum::Romance->value,

        // Horror variants
        'horror' => GenreEnum::Horror->value,
        'supernatural horror' => GenreEnum::Horror->value,
        'gothic horror' => GenreEnum::Horror->value,
        'psychological horror' => GenreEnum::Horror->value,
        'cosmic horror' => GenreEnum::Horror->value,
        'lovecraftian' => GenreEnum::Horror->value,
        'haunted house' => GenreEnum::Horror->value,
        'zombies' => GenreEnum::Horror->value,
        'vampires' => GenreEnum::Horror->value,
        'werewolves' => GenreEnum::Horror->value,
        'ghosts' => GenreEnum::Horror->value,
        'gothic' => GenreEnum::Horror->value,

        // Historical Fiction variants
        'historical fiction' => GenreEnum::HistoricalFiction->value,
        'historical' => GenreEnum::HistoricalFiction->value,
        'alternate history' => GenreEnum::HistoricalFiction->value,
        'war fiction' => GenreEnum::HistoricalFiction->value,
        'world war ii' => GenreEnum::HistoricalFiction->value,
        'world war i' => GenreEnum::HistoricalFiction->value,
        'civil war' => GenreEnum::HistoricalFiction->value,
        'medieval' => GenreEnum::HistoricalFiction->value,
        'victorian' => GenreEnum::HistoricalFiction->value,
        'regency' => GenreEnum::HistoricalFiction->value,

        // Crime variants
        'crime' => GenreEnum::Crime->value,
        'crime fiction' => GenreEnum::Crime->value,
        'organized crime' => GenreEnum::Crime->value,
        'heist' => GenreEnum::Crime->value,
        'gangster' => GenreEnum::Crime->value,
        'mafia' => GenreEnum::Crime->value,
        'legal' => GenreEnum::Crime->value,
        'courtroom drama' => GenreEnum::Crime->value,

        // Adventure variants
        'adventure' => GenreEnum::Adventure->value,
        'action' => GenreEnum::Adventure->value,
        'action & adventure' => GenreEnum::Adventure->value,
        'survival' => GenreEnum::Adventure->value,
        'pirates' => GenreEnum::Adventure->value,
        'sea stories' => GenreEnum::Adventure->value,
        'western' => GenreEnum::Adventure->value,
        'westerns' => GenreEnum::Adventure->value,

        // Literary Fiction variants
        'literary fiction' => GenreEnum::Literary->value,
        'literary' => GenreEnum::Literary->value,
        'contemporary fiction' => GenreEnum::Literary->value,
        'general fiction' => GenreEnum::Literary->value,
        'family saga' => GenreEnum::Literary->value,
        'coming of age' => GenreEnum::Literary->value,
        'bildungsroman' => GenreEnum::Literary->value,
        'domestic fiction' => GenreEnum::Literary->value,
        'women\'s fiction' => GenreEnum::Literary->value,

        // Biography variants
        'biography' => GenreEnum::Biography->value,
        'biographies' => GenreEnum::Biography->value,
        'autobiography' => GenreEnum::Biography->value,
        'biographical' => GenreEnum::Biography->value,
        'life stories' => GenreEnum::Biography->value,

        // Memoir variants
        'memoir' => GenreEnum::Memoir->value,
        'memoirs' => GenreEnum::Memoir->value,
        'personal memoirs' => GenreEnum::Memoir->value,
        'personal narratives' => GenreEnum::Memoir->value,

        // History variants
        'history' => GenreEnum::History->value,
        'historical' => GenreEnum::History->value,
        'ancient history' => GenreEnum::History->value,
        'modern history' => GenreEnum::History->value,
        'military history' => GenreEnum::History->value,
        'social history' => GenreEnum::History->value,
        'cultural history' => GenreEnum::History->value,

        // Science variants
        'science' => GenreEnum::Science->value,
        'popular science' => GenreEnum::Science->value,
        'physics' => GenreEnum::Science->value,
        'biology' => GenreEnum::Science->value,
        'chemistry' => GenreEnum::Science->value,
        'astronomy' => GenreEnum::Science->value,
        'cosmology' => GenreEnum::Science->value,
        'mathematics' => GenreEnum::Science->value,
        'technology' => GenreEnum::Science->value,
        'nature' => GenreEnum::Science->value,
        'environment' => GenreEnum::Science->value,

        // Self-Help variants
        'self-help' => GenreEnum::SelfHelp->value,
        'self help' => GenreEnum::SelfHelp->value,
        'personal development' => GenreEnum::SelfHelp->value,
        'personal growth' => GenreEnum::SelfHelp->value,
        'motivation' => GenreEnum::SelfHelp->value,
        'motivational' => GenreEnum::SelfHelp->value,
        'inspirational' => GenreEnum::SelfHelp->value,
        'self-improvement' => GenreEnum::SelfHelp->value,
        'productivity' => GenreEnum::SelfHelp->value,
        'success' => GenreEnum::SelfHelp->value,
        'happiness' => GenreEnum::SelfHelp->value,
        'mindfulness' => GenreEnum::SelfHelp->value,
        'wellness' => GenreEnum::SelfHelp->value,
        'health' => GenreEnum::SelfHelp->value,

        // Business variants
        'business' => GenreEnum::Business->value,
        'business & economics' => GenreEnum::Business->value,
        'economics' => GenreEnum::Business->value,
        'finance' => GenreEnum::Business->value,
        'investing' => GenreEnum::Business->value,
        'entrepreneurship' => GenreEnum::Business->value,
        'management' => GenreEnum::Business->value,
        'leadership' => GenreEnum::Business->value,
        'marketing' => GenreEnum::Business->value,

        // Philosophy variants
        'philosophy' => GenreEnum::Philosophy->value,
        'ethics' => GenreEnum::Philosophy->value,
        'metaphysics' => GenreEnum::Philosophy->value,
        'logic' => GenreEnum::Philosophy->value,
        'existentialism' => GenreEnum::Philosophy->value,
        'stoicism' => GenreEnum::Philosophy->value,
        'religion' => GenreEnum::Philosophy->value,
        'spirituality' => GenreEnum::Philosophy->value,

        // Travel variants
        'travel' => GenreEnum::Travel->value,
        'travel writing' => GenreEnum::Travel->value,
        'travel literature' => GenreEnum::Travel->value,
        'adventure travel' => GenreEnum::Travel->value,
        'travelogue' => GenreEnum::Travel->value,

        // True Crime variants
        'true crime' => GenreEnum::TrueCrime->value,
        'true-crime' => GenreEnum::TrueCrime->value,
        'true stories' => GenreEnum::TrueCrime->value,
        'crime nonfiction' => GenreEnum::TrueCrime->value,

        // Psychology variants
        'psychology' => GenreEnum::Psychology->value,
        'cognitive psychology' => GenreEnum::Psychology->value,
        'social psychology' => GenreEnum::Psychology->value,
        'behavioral psychology' => GenreEnum::Psychology->value,
        'neuroscience' => GenreEnum::Psychology->value,
        'psychiatry' => GenreEnum::Psychology->value,
        'mental health' => GenreEnum::Psychology->value,
        'relationships' => GenreEnum::Psychology->value,

        // Young Adult variants
        'young adult' => GenreEnum::YoungAdult->value,
        'ya' => GenreEnum::YoungAdult->value,
        'ya fiction' => GenreEnum::YoungAdult->value,
        'teen' => GenreEnum::YoungAdult->value,
        'teen fiction' => GenreEnum::YoungAdult->value,
        'juvenile fiction' => GenreEnum::YoungAdult->value,
        'teenagers' => GenreEnum::YoungAdult->value,

        // Children's variants
        'children\'s' => GenreEnum::Childrens->value,
        'childrens' => GenreEnum::Childrens->value,
        'children' => GenreEnum::Childrens->value,
        'kids' => GenreEnum::Childrens->value,
        'juvenile' => GenreEnum::Childrens->value,
        'middle grade' => GenreEnum::Childrens->value,
        'picture books' => GenreEnum::Childrens->value,
        'chapter books' => GenreEnum::Childrens->value,

        // Graphic Novel variants
        'graphic novel' => GenreEnum::GraphicNovel->value,
        'graphic novels' => GenreEnum::GraphicNovel->value,
        'comics' => GenreEnum::GraphicNovel->value,
        'comic books' => GenreEnum::GraphicNovel->value,
        'manga' => GenreEnum::GraphicNovel->value,
        'sequential art' => GenreEnum::GraphicNovel->value,

        // Poetry variants
        'poetry' => GenreEnum::Poetry->value,
        'poems' => GenreEnum::Poetry->value,
        'verse' => GenreEnum::Poetry->value,

        // Classics variants
        'classics' => GenreEnum::Classics->value,
        'classic' => GenreEnum::Classics->value,
        'classic literature' => GenreEnum::Classics->value,
        'classic fiction' => GenreEnum::Classics->value,
        'world literature' => GenreEnum::Classics->value,

        // Short Stories variants
        'short stories' => GenreEnum::ShortStories->value,
        'short fiction' => GenreEnum::ShortStories->value,
        'anthologies' => GenreEnum::ShortStories->value,
        'collections' => GenreEnum::ShortStories->value,
        'novellas' => GenreEnum::ShortStories->value,
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Books Specific Mappings
    |--------------------------------------------------------------------------
    */
    'google_books' => [
        'fiction / general' => GenreEnum::Literary->value,
        'fiction / literary' => GenreEnum::Literary->value,
        'fiction / science fiction / general' => GenreEnum::ScienceFiction->value,
        'fiction / science fiction / space opera' => GenreEnum::ScienceFiction->value,
        'fiction / fantasy / general' => GenreEnum::Fantasy->value,
        'fiction / fantasy / epic' => GenreEnum::Fantasy->value,
        'fiction / mystery & detective / general' => GenreEnum::Mystery->value,
        'fiction / thrillers / general' => GenreEnum::Thriller->value,
        'fiction / romance / general' => GenreEnum::Romance->value,
        'fiction / horror' => GenreEnum::Horror->value,
        'fiction / historical / general' => GenreEnum::HistoricalFiction->value,
        'young adult fiction / general' => GenreEnum::YoungAdult->value,
        'juvenile fiction / general' => GenreEnum::Childrens->value,
        'biography & autobiography / general' => GenreEnum::Biography->value,
        'history / general' => GenreEnum::History->value,
        'science / general' => GenreEnum::Science->value,
        'self-help / general' => GenreEnum::SelfHelp->value,
        'business & economics / general' => GenreEnum::Business->value,
        'philosophy / general' => GenreEnum::Philosophy->value,
        'psychology / general' => GenreEnum::Psychology->value,
        'travel / general' => GenreEnum::Travel->value,
        'true crime / general' => GenreEnum::TrueCrime->value,
        'poetry / general' => GenreEnum::Poetry->value,
        'comics & graphic novels / general' => GenreEnum::GraphicNovel->value,
    ],

    /*
    |--------------------------------------------------------------------------
    | Goodreads Specific Mappings
    |--------------------------------------------------------------------------
    */
    'goodreads' => [
        'to-read' => null,
        'currently-reading' => null,
        'read' => null,
        'favorites' => null,
        'owned' => null,
        'owned-books' => null,
        're-read' => null,
        'ebook' => null,
        'audiobook' => null,
        'kindle' => null,
        'library' => null,
        'borrowed' => null,
        'dnf' => null,
        'did-not-finish' => null,
    ],

    /*
    |--------------------------------------------------------------------------
    | OPDS Specific Mappings
    |--------------------------------------------------------------------------
    */
    'opds' => [
        // Add OPDS-specific mappings as needed
    ],
];
