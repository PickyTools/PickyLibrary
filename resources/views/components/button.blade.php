{{--
    The Vue adapter is src/components/BaseButton.vue, and the two render the same
    markup: src/blade.test.ts fails when they drift.

    Two of the Vue props are deliberately absent, because both are behaviour and a
    Blade page runs no JavaScript:

    - `tempLabel` swaps the label for a moment after a click.
    - `color="custom"` needs a luminance calculation to pick readable text, which
      lives in src/core/contrast.ts. Porting a pure function is cheap and is the
      obvious next step; guessing black or white in a template is not.

    Everything visual is a data attribute read by styles/components/button.css. No
    class name is computed here, the same rule the Vue adapter follows.
--}}
@props([
    'size' => 'md',
    'variant' => 'full',
    'color' => 'primary',
    'label' => '',
    'disabled' => false,
    'htmlType' => 'button',
    'roundedSide' => 'all',
    'transitionRadius' => false,
    'shadow' => null,
    'href' => null,
    'target' => null,
    'rel' => null,
])
@php
    $isLink = filled($href);
    $element = $isLink ? 'a' : 'button';

    /*
     * The safety net the Vue adapter has: a button whose content is an icon would
     * otherwise have no accessible name. An explicit aria-label from the caller
     * always wins, and when the label is the visible text we leave it off rather
     * than name the button twice.
     */
    $ariaLabel = ! $attributes->has('aria-label') && $label !== '' && $slot->isNotEmpty()
        ? $label
        : null;
@endphp
<{{ $element }}
    @if ($isLink)
        @if (! $disabled) href="{{ $href }}" @endif
        @if ($target !== null) target="{{ $target }}" @endif
        @if ($rel !== null) rel="{{ $rel }}" @endif
        @if ($disabled) role="link" tabindex="-1" @endif
    @else
        type="{{ $htmlType }}"
        @disabled($disabled)
    @endif
    @if ($disabled) aria-disabled="true" @endif
    @if ($ariaLabel !== null) aria-label="{{ $ariaLabel }}" @endif
    @if ($shadow !== null) data-picky-shadow="{{ $shadow }}" @endif
    data-size="{{ $size }}"
    data-variant="{{ $variant }}"
    data-color="{{ $color }}"
    data-rounded="{{ $roundedSide }}"
    @if ($transitionRadius) data-transition-radius="true" @endif
    {{ $attributes->merge(['class' => 'picky-reset picky-button']) }}
><span class="picky-button__inner picky-pressable">{{ $prefix ?? '' }}{{ $slot->isEmpty() ? $label : $slot }}{{ $suffix ?? '' }}</span></{{ $element }}>
