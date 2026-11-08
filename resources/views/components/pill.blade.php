{{--
    The Vue adapter is src/components/BasePill.vue, and the two render the same
    markup: src/blade.test.ts fails when they drift.

    No `picky-reset` here, deliberately. A pill is a <span>, which carries none of
    the browser styling a <button> or an <input> does, so there is nothing to undo.
--}}
@props([
    'size' => 'md',
    'color' => 'primary',
    'background' => 'light',
    'label' => '',
])
<span
    {{ $attributes->merge(['class' => 'picky-pill']) }}
    data-size="{{ $size }}"
    data-color="{{ $color }}"
    data-background="{{ $background }}"
>{{ $slot->isEmpty() ? $label : $slot }}</span>
