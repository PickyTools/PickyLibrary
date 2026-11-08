<?php

declare(strict_types=1);

namespace PickyLibrary;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the Blade adapter.
 *
 * There is nothing to publish and nothing to configure. The components are
 * anonymous views, so they hold no PHP of their own: a Blade component here is
 * the same markup contract the Vue adapter renders, written in the one language
 * a Blade page can execute.
 *
 * The stylesheet is not registered from here. It ships in this package so a PHP
 * project needs no npm install, but which bundler picks it up is the
 * application's business. @see BLADE.md
 */
final class PickyLibraryServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadViewsFrom(self::viewPath(), 'picky');

        self::registerComponents();
    }

    /**
     * Teaches Blade the component tags.
     *
     * `<x-picky::button />` rather than `<x-picky-button />`. A namespace cannot
     * collide with an application's own components, which a bare prefix can: an
     * app with its own `components/button.blade.php` would otherwise have two
     * things answering to one tag.
     *
     * Its own method because the conformance renderer calls it too, and a
     * registration written out twice is a test that passes against a tag no
     * application can use.
     */
    public static function registerComponents(): void
    {
        Blade::anonymousComponentNamespace('picky::components', 'picky');
    }

    /**
     * Where the component views live, for the service provider and for the
     * conformance renderer, which wires up Blade without a Laravel application.
     */
    public static function viewPath(): string
    {
        return dirname(__DIR__).'/resources/views';
    }
}
