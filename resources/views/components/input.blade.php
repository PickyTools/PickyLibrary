{{--
    The Vue adapter is src/components/BaseInput.vue, and the two render the same
    markup: src/blade.test.ts fails when they drift.

    Two differences from the Vue props, both because this side has no reactivity:

    - `modelValue` is `value` here. A server-rendered field is handed a value and
      prints it; there is nothing to model.
    - `id` is required when a label, a hint or an error is used, because those are
      wired to the field by id. The Vue adapter can fall back to `useId()`; a
      Blade view has no equivalent that is stable between the markup and a test.

    `class` and `style` land on the root, every other attribute on the field, which
    is the split `inheritAttrs: false` makes on the Vue side.
--}}
@props([
    'size' => 'md',
    'type' => 'text',
    'value' => '',
    'label' => '',
    'placeholder' => '',
    'hint' => '',
    'error' => '',
    'disabled' => false,
    'readonly' => false,
    'required' => false,
    'name' => null,
    'id' => null,
    'autocomplete' => null,
    'rows' => 3,
    'min' => null,
    'max' => null,
    'step' => null,
    'minlength' => null,
    'maxlength' => null,
    'pattern' => null,
])
@php
    $isTextarea = $type === 'textarea';
    $hasError = $error !== '';

    /** One attribute for the three mutually exclusive states input.css knows about. */
    $state = $hasError ? 'error' : ($readonly ? 'readonly' : 'default');

    $messageId = $id !== null ? $id.'-message' : null;
    $hintId = $id !== null ? $id.'-hint' : null;
    $showsHint = $hint !== '' && ! $hasError;

    $fieldAttributes = array_filter(
        [
            'id' => $id,
            'type' => $isTextarea ? null : $type,
            'name' => $name,
            'placeholder' => $placeholder !== '' ? $placeholder : null,
            'rows' => $isTextarea ? $rows : null,
            'min' => $isTextarea ? null : $min,
            'max' => $isTextarea ? null : $max,
            'step' => $isTextarea ? null : $step,
            'minlength' => $minlength,
            'maxlength' => $maxlength,
            'pattern' => $isTextarea ? null : $pattern,
            'autocomplete' => $autocomplete,
            // Named by the label where there is one, by the placeholder otherwise.
            'aria-label' => $label === '' && $placeholder !== '' ? $placeholder : null,
            'aria-describedby' => $hasError ? $messageId : ($hint !== '' ? $hintId : null),
            'aria-invalid' => $hasError ? 'true' : null,
            'aria-required' => $required ? 'true' : null,
        ],
        static fn ($attribute) => $attribute !== null,
    );
@endphp
<div
    {{ $attributes->only(['class', 'style'])->merge(['class' => 'picky-input']) }}
    data-size="{{ $size }}"
    data-state="{{ $state }}"
    @if ($isTextarea) data-multiline="true" @endif
    @if ($disabled) data-disabled="true" @endif
>
    @if ($label !== '')
        <label for="{{ $id }}" class="picky-input__label">{{ $label }}@if ($required)<span class="picky-input__required" aria-hidden="true">*</span>@endif</label>
    @endif

    {{--
        The wrapper carries all the styling; the field itself is bare. Being a
        <label for>, it forwards edge clicks to the field natively, so no
        mouse-only click handling is needed.
    --}}
    <label for="{{ $id }}" class="picky-input__control picky-pressable">
        @isset($prefix)<span class="picky-input__prefix">{{ $prefix }}</span>@endisset

        @if ($isTextarea)
            <textarea
                {{ $attributes->except(['class', 'style'])->merge($fieldAttributes)->class(['picky-reset', 'picky-input__field']) }}
                @disabled($disabled) @readonly($readonly) @required($required)
            >{{ $value }}</textarea>
        @else
            <input
                {{ $attributes->except(['class', 'style'])->merge($fieldAttributes)->class(['picky-reset', 'picky-input__field']) }}
                value="{{ $value }}"
                @disabled($disabled) @readonly($readonly) @required($required)
            />
        @endif

        @isset($suffix)<span class="picky-input__suffix">{{ $suffix }}</span>@endisset
    </label>

    {{-- A hint is static text and is never announced. --}}
    @if ($showsHint)
        <p @if ($hintId !== null) id="{{ $hintId }}" @endif class="picky-input__message">{{ $hint }}</p>
    @endif

    {{--
        The error region is in the document from the first render, empty, with its
        role already on it. A live region that arrives together with its message is
        one several screen readers never read out. @see BaseInput.vue, which says
        the whole of it, and input.css for why empty means out of the flow rather
        than hidden.
    --}}
    <p @if ($messageId !== null) id="{{ $messageId }}" @endif role="alert" class="picky-input__message" @if (! $hasError) data-empty="" @endif>{{ $error }}</p>
</div>
