<?php

declare(strict_types=1);

/*
 * Renders every conformance case with the Blade adapter and writes the markup to
 * stdout as JSON. src/blade.test.ts runs this, renders the same cases with the Vue
 * adapter, and compares the two.
 *
 * Blade is wired up by hand here rather than booted through a Laravel application.
 * The adapter is a handful of anonymous views; pulling in the framework to render
 * them would make the test say as much about Laravel's bootstrap as about this
 * package.
 *
 *     php conformance/render-blade.php
 */

use Illuminate\Container\Container;
use Illuminate\Events\Dispatcher;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Str;
use Illuminate\View\Compilers\BladeCompiler;
use Illuminate\View\Engines\CompilerEngine;
use Illuminate\View\Engines\EngineResolver;
use Illuminate\View\Engines\PhpEngine;
use Illuminate\View\Factory;
use Illuminate\View\FileViewFinder;
use PickyLibrary\PickyLibraryServiceProvider;

$root = dirname(__DIR__);

if (! is_file($root.'/vendor/autoload.php')) {
    fwrite(STDERR, "The PHP dependencies are missing. Run `composer install`.\n");
    exit(2);
}

require $root.'/vendor/autoload.php';

$container = new Container();
Container::setInstance($container);
Facade::setFacadeApplication($container);

$files = new Filesystem();
$cache = sys_get_temp_dir().'/picky-blade-conformance';
$files->ensureDirectoryExists($cache);

$compiler = new BladeCompiler($files, $cache);
$container->instance('blade.compiler', $compiler);

$resolver = new EngineResolver();
$resolver->register('blade', static fn () => new CompilerEngine($compiler));
$resolver->register('php', static fn () => new PhpEngine($files));

$views = PickyLibraryServiceProvider::viewPath();

/*
 * Each case is written out as a view of its own and rendered by name. The other
 * way in is `Blade::render()`, which takes a string, but it builds an anonymous
 * component and reads the compiled path out of a `config` binding -- a whole
 * configuration repository to stand up, for a path this script already knows.
 */
$scratch = $cache.'/views';
$files->deleteDirectory($scratch);
$files->ensureDirectoryExists($scratch);

$finder = new FileViewFinder($files, [$scratch, $views]);
$finder->addNamespace('picky', $views);

$factory = new Factory($resolver, $finder, new Dispatcher($container));
$factory->setContainer($container);
$container->instance('view', $factory);
$container->instance(Illuminate\Contracts\View\Factory::class, $factory);

/*
 * Blade looks for a class-based component before it looks for an anonymous one,
 * and that guess reads the application's namespace. There is no application
 * here, so this stands in for one. It is reached only on the way past: every tag
 * in the cases resolves to a view.
 */
$container->instance(
    Illuminate\Contracts\Foundation\Application::class,
    new class
    {
        public function getNamespace(): string
        {
            return 'PickyLibraryConformance\\';
        }
    }
);

PickyLibraryServiceProvider::registerComponents();

$definition = json_decode((string) file_get_contents(__DIR__.'/cases.json'), true, flags: JSON_THROW_ON_ERROR);

/** Vue prop name => Blade prop name, for the few that differ on purpose. */
$aliases = array_filter(
    $definition['aliases'],
    static fn (string $key): bool => $key !== '//',
    ARRAY_FILTER_USE_KEY
);

/**
 * One case as a line of Blade. A bare attribute is how the tag compiler is told
 * `true`, and a `false` is left off entirely so the view's own default stands.
 */
$tagFor = static function (array $case) use ($aliases): string {
    $attributes = [];

    foreach ($case['props'] ?? [] as $prop => $value) {
        $name = Str::kebab($aliases[$prop] ?? $prop);

        if ($value === false) {
            continue;
        }

        if ($value === true) {
            $attributes[] = $name;
            continue;
        }

        $attributes[] = sprintf('%s="%s"', $name, htmlspecialchars((string) $value, ENT_QUOTES));
    }

    $slots = $case['slots'] ?? [];
    $inner = '';

    foreach ($slots as $slot => $content) {
        if ($slot === 'default') {
            continue;
        }

        $inner .= sprintf('<x-slot:%s>%s</x-slot:%s>', $slot, htmlspecialchars((string) $content), $slot);
    }

    $inner .= htmlspecialchars((string) ($slots['default'] ?? ''));

    $tag = 'x-picky::'.$case['view'];
    $open = trim($tag.' '.implode(' ', $attributes));

    return $inner === ''
        ? sprintf('<%s />', $open)
        : sprintf('<%s>%s</%s>', $open, $inner, $tag);
};

$rendered = [];

foreach ($definition['cases'] as $index => $case) {
    $view = 'case_'.$index;
    $files->put($scratch.'/'.$view.'.blade.php', $tagFor($case));

    $rendered[$case['name']] = $factory->make($view)->render();
}

echo json_encode($rendered, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
