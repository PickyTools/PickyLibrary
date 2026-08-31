/*
 * Generates API.md from the components themselves.
 *
 * Hand-written API tables drift: a prop gets renamed, the table does not, and the
 * documentation quietly starts lying. Reading the source instead means the two
 * cannot disagree -- and api-docs.test.ts fails the build if API.md is stale.
 *
 * Run with: npm run docs:api
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const COMPONENTS = join(process.cwd(), 'src/components');

/** Props contributed by the shared helper types in src/core/types.ts. */
const SIZE = { name: 'size', type: 'Size', optional: true, doc: 'One of `xs`, `sm`, `md`, `lg`.' };
const DISABLED = { name: 'disabled', type: 'boolean', optional: true, doc: 'Disables the control.' };
const COLOR = { name: 'color', type: 'Color', optional: true, doc: 'One of the seven semantic colours.' };

const SHARED = {
    HasSize: [SIZE],
    HasDisabled: [DISABLED],
    HasColor: [COLOR],
    BaseComponentProps: [SIZE, DISABLED],
};

/** Strips comment punctuation from one line, leaving the prose. */
function stripComment(line) {
    return line
        .replace(/^\/\*\*?/, '')   // opening /** or /*
        .replace(/^\/\//, '')      // line comment
        .replace(/\*\/\s*$/, '')   // closing */, before the leading * is stripped
        .replace(/^\*+/, '')       // continuation *
        .trim();
}

/** Returns the balanced body of the block that starts at the first `open` after `from`. */
function balanced(source, from, open = '{', close = '}') {
    const start = source.indexOf(open, from);
    if (start < 0) return null;

    let depth = 0;
    for (let i = start; i < source.length; i += 1) {
        if (source[i] === open) depth += 1;
        else if (source[i] === close) {
            depth -= 1;
            if (depth === 0) return { body: source.slice(start + 1, i), end: i };
        }
    }
    return null;
}

/** The generic argument of `name<...>`, balanced over nested angle brackets. */
function genericOf(source, name) {
    const at = source.indexOf(`${name}<`);
    if (at < 0) return null;
    return balanced(source, at + name.length, '<', '>')?.body ?? null;
}

/** Splits an object-type body into members, ignoring nested braces and comments. */
function members(body) {
    const out = [];
    let doc = [];
    let buffer = '';
    let depth = 0;

    for (const raw of body.split('\n')) {
        const line = raw.trim();
        if (!line) continue;

        if (line.startsWith('/**') || line.startsWith('*') || line.startsWith('//')) {
            doc.push(stripComment(line));
            continue;
        }

        buffer += (buffer ? ' ' : '') + line;
        depth += (line.match(/[{<(]/g) ?? []).length - (line.match(/[}>)]/g) ?? []).length;
        if (depth > 0) continue;

        const match = /^([A-Za-z_$][\w$]*)(\?)?:\s*(.+?);?$/.exec(buffer);
        if (match) {
            out.push({
                name: match[1],
                optional: Boolean(match[2]),
                type: match[3].replace(/;$/, '').trim(),
                doc: doc.filter(Boolean).join(' '),
            });
        }
        buffer = '';
        doc = [];
    }
    return out;
}

/** Reads the defaults object passed to withDefaults(). */
function defaults(source) {
    const at = source.indexOf('withDefaults(');
    if (at < 0) return {};

    const args = balanced(source, at + 'withDefaults'.length, '(', ')');
    if (!args) return {};

    const objectAt = args.body.lastIndexOf('{');
    if (objectAt < 0) return {};

    const object = balanced(args.body, objectAt);
    if (!object) return {};

    const found = {};
    for (const [, key, value] of object.body.matchAll(/^\s*([A-Za-z_$][\w$]*):\s*(.+?),?\s*$/gm)) {
        found[key] = value.trim().replace(/,$/, '');
    }
    return found;
}

/** Local `type X = ...` aliases, so a reader sees the values instead of a name. */
function aliases(source) {
    const found = {};
    for (const [, name, value] of source.matchAll(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/gm)) {
        found[name] = value.replace(/\s+/g, ' ').trim();
    }
    return found;
}

function expand(type, found) {
    return found[type] ?? type;
}

function propsOf(source) {
    const generic = genericOf(source, 'defineProps');
    if (!generic) return [];

    const shared = [];
    for (const [name, props] of Object.entries(SHARED)) {
        // Only the intersection part before the inline object literal.
        const head = generic.split('{')[0];
        if (new RegExp(`\\b${name}\\b`).test(head)) shared.push(...props);
    }

    const inline = generic.indexOf('{') >= 0 ? members(balanced(generic, generic.indexOf('{') - 1).body) : [];

    // A shared prop redeclared inline keeps its inline documentation.
    const names = new Set(inline.map((p) => p.name));
    return [...shared.filter((p) => !names.has(p.name)), ...inline];
}

function slotsOf(source) {
    const generic = genericOf(source, 'defineSlots');
    if (!generic) return [];

    const out = [];
    let doc = [];
    for (const raw of generic.split('\n')) {
        const line = raw.trim();
        if (!line || line === '{' || line === '}') continue;

        if (line.startsWith('/**') || line.startsWith('*') || line.startsWith('//')) {
            doc.push(stripComment(line));
            continue;
        }

        // Slots are declared optional (`name?(...)`), because an unfilled slot is undefined.
        const match = /^'?([\w-]+)'?\??\s*\(([^)]*)\)/.exec(line);
        if (match) {
            out.push({ name: match[1], props: match[2].trim(), doc: doc.filter(Boolean).join(' ') });
            doc = [];
        }
    }
    return out;
}

function emitsOf(source) {
    const generic = genericOf(source, 'defineEmits');
    if (!generic) return [];

    return [...generic.matchAll(/\(e:\s*'([^']+)'(?:,\s*([^)]*))?\)/g)].map((m) => ({
        name: m[1],
        payload: (m[2] ?? '').trim(),
    }));
}

function exposedOf(source) {
    const at = source.indexOf('defineExpose(');
    if (at < 0) return [];

    const args = balanced(source, at + 'defineExpose'.length, '(', ')');
    if (!args) return [];

    return [...args.body.matchAll(/^\s*(?:\/\*\*.*\*\/\s*)?([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]);
}

const escape = (text) => text.replace(/\|/g, '\\|');

function render(name, source) {
    const local = aliases(source);
    const props = propsOf(source);
    const fallbacks = defaults(source);
    const slots = slotsOf(source);
    const emits = emitsOf(source);
    const exposed = exposedOf(source);

    const lines = [`## ${name}`, ''];

    if (props.length) {
        lines.push('| Prop | Type | Default | Description |', '| --- | --- | --- | --- |');
        for (const prop of props) {
            const fallback = fallbacks[prop.name];
            const shown = fallback && fallback !== 'undefined' ? `\`${escape(fallback)}\`` : '';
            const required = prop.optional ? '' : ' **(required)**';
            lines.push(
                `| \`${prop.name}\`${required} | \`${escape(expand(prop.type, local))}\` | ${shown} | ${escape(prop.doc)} |`
            );
        }
        lines.push('');
    }

    if (emits.length) {
        lines.push('**Events**', '');
        for (const event of emits) {
            lines.push(`- \`${event.name}\`${event.payload ? ` — \`${escape(event.payload)}\`` : ''}`);
        }
        lines.push('');
    }

    if (slots.length) {
        lines.push('**Slots**', '');
        for (const slot of slots) {
            const scope = slot.props ? ` — scoped: \`${escape(slot.props)}\`` : '';
            lines.push(`- \`${slot.name}\`${scope}${slot.doc ? ` — ${escape(slot.doc)}` : ''}`);
        }
        lines.push('');
    }

    if (exposed.length) {
        lines.push(`**Exposed via template ref:** ${exposed.map((e) => `\`${e}\``).join(', ')}`, '');
    }

    return lines.join('\n');
}

export function generate() {
    const files = readdirSync(COMPONENTS)
        .filter((file) => file.endsWith('.vue'))
        .sort();

    const sections = files.map((file) =>
        render(file.replace('.vue', ''), readFileSync(join(COMPONENTS, file), 'utf8'))
    );

    return `<!-- Generated by scripts/generate-api-docs.mjs. Run \`npm run docs:api\` after
changing a component; api-docs.test.ts fails if this file is out of date. -->

# API reference

Every component below is exported from the package root:

\`\`\`js
import { BaseButton } from 'pickylibrary';
import 'pickylibrary/style.css';
\`\`\`

\`Size\` is \`'xs' | 'sm' | 'md' | 'lg'\`. \`Color\` is \`'primary' | 'secondary' |
'success' | 'danger' | 'warning' | 'info' | 'gray'\`. Styling hooks -- class names and
data attributes -- are documented in [STYLING.md](STYLING.md).

${sections.join('\n---\n\n')}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    writeFileSync(join(process.cwd(), 'API.md'), generate());
    console.log('API.md written');
}
