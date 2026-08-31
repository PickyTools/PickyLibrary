import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { IconResolverKey } from './icons';
import BaseAlert from './components/BaseAlert.vue';
import BaseButton from './components/BaseButton.vue';
import BaseCheckbox from './components/BaseCheckbox.vue';
import BaseIcon from './components/BaseIcon.vue';
import BaseInput from './components/BaseInput.vue';
import BaseModal from './components/BaseModal.vue';
import BasePasswordInput from './components/BasePasswordInput.vue';
import BasePill from './components/BasePill.vue';
import BaseSelect from './components/BaseSelect.vue';
import BaseSwitch from './components/BaseSwitch.vue';

/*
 * Runs axe-core over every component.
 *
 * Be clear about what this does and does not buy, because a green run here is not
 * a clean bill of health. Under happy-dom axe evaluates only the rules that need
 * nothing but the DOM tree. Measured, it catches:
 *
 *   button-name, image-alt, label  -- missing accessible names
 *
 * and it silently skips broken aria references, duplicate ids and colour contrast,
 * because those need layout and computed styles that happy-dom does not provide.
 *
 * Those three gaps are covered elsewhere: duplicate ids and aria wiring by the
 * component tests (see BaseModal and core/select), and contrast by contrast.test.ts,
 * which reads the stylesheet directly and does a better job than axe could here.
 *
 * The full rule set is requested anyway, so anything happy-dom learns to support
 * starts counting on its own.
 */

const provide = { [IconResolverKey as symbol]: () => '<svg viewBox="0 0 1 1"></svg>' };

beforeAll(() => {
    const proto = window.HTMLDialogElement?.prototype;
    if (proto && typeof proto.showModal !== 'function') {
        proto.showModal = function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        };
        proto.close = function (this: HTMLDialogElement) {
            this.removeAttribute('open');
        };
    }
});

afterEach(() => {
    document.body.innerHTML = '';
});

async function auditViolations(): Promise<string[]> {
    const results = await axe.run(document.body, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] });
    return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cases: Array<[string, any, Record<string, unknown>]> = [
    ['BaseButton with a label', BaseButton, { label: 'Save' }],
    ['BaseButton as a link', BaseButton, { label: 'Docs', href: '/docs' }],
    ['BaseButton disabled', BaseButton, { label: 'Save', disabled: true }],
    ['BasePill', BasePill, { label: 'Beta' }],
    ['BaseIcon, decorative', BaseIcon, { code: 'check' }],
    ['BaseIcon, meaningful', BaseIcon, { code: 'check', label: 'Done' }],
    ['BaseAlert', BaseAlert, { title: 'Heads up', description: 'Something happened.' }],
    ['BaseAlert, dismissible', BaseAlert, { title: 'Heads up', dismissible: true }],
    ['BaseInput', BaseInput, { label: 'Name', modelValue: '' }],
    ['BaseInput with an error', BaseInput, { label: 'Name', modelValue: '', error: 'Required' }],
    ['BaseInput as a textarea', BaseInput, { label: 'Bio', type: 'textarea', modelValue: '' }],
    ['BasePasswordInput', BasePasswordInput, { modelValue: '' }],
    ['BaseCheckbox', BaseCheckbox, { label: 'Accept terms' }],
    ['BaseSwitch', BaseSwitch, { ariaLabel: 'Dark mode' }],
    ['BaseModal', BaseModal, { modelValue: true, title: 'Confirm', teleportDisabled: true }],
    [
        'BaseSelect',
        BaseSelect,
        { label: 'Fruit', modelValue: 'a', options: [{ label: 'Apple', value: 'a' }] },
    ],
];

describe.each(cases)('%s', (_name, component, props) => {
    it('has no detectable accessibility violations', async () => {
        const wrapper = mount(component, { props, global: { provide }, attachTo: document.body });
        expect(await auditViolations()).toEqual([]);
        wrapper.unmount();
    });
});

describe('an unlabelled control is caught', () => {
    // Proves the audit can actually fail. Without this the suite above could be
    // green because axe is checking nothing at all.
    it('reports a button with no accessible name', async () => {
        document.body.innerHTML = '<button></button>';
        expect(await auditViolations()).toContainEqual(expect.stringContaining('button-name'));
    });
});
