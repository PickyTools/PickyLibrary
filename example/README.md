# PickyLibrary example

A bare consumer app: no Tailwind, no preset, no build configuration beyond the Vue plugin.

```bash
npm install
npm run dev
```

Worth looking at:

- **`src/main.ts`** — the entire setup is two imports.
- **`src/icons.ts`** — one resolver serving two icon sources. Lucide (ISC) returns Vue
  components; brand marks come from Simple Icons (CC0) as raw SVG, because Lucide
  deliberately ships none. A resolver may also return a URL.
- **`src/App.vue`** — theming happens by setting CSS variables and one `data-picky-shadow`
  attribute. There is no JavaScript configuration API to learn.

The `resolve.dedupe: ['vue']` in `vite.config.ts` matters only because the library is linked
from the parent folder: without it Vite loads two copies of Vue and `provide`/`inject` fails
silently. A normal install from npm does not need it.
