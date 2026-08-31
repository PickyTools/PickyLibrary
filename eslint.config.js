import tseslint from 'typescript-eslint';

/*
 * One rule, and it is the most important one in the project: nothing in src/core/
 * may import a framework.
 *
 * Core holds the behaviour, the types and the state machines -- the part a React or
 * Angular adapter would reuse unchanged. The moment a single `import { ref } from
 * 'vue'` slips in, that stops being true, and you only find out when you start
 * building that second adapter. Better an error now than a rewrite in a year.
 */
export default tseslint.config(
    { ignores: ['dist/**', 'coverage/**', 'example/**', 'node_modules/**'] },

    ...tseslint.configs.recommended,

    {
        files: ['src/core/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'vue',
                            message:
                                'src/core/ must stay framework-free so a React or Angular ' +
                                'adapter can reuse the same logic. Put this in ' +
                                'src/components/, or pass it in as a parameter.',
                        },
                        {
                            name: '@vue/reactivity',
                            message: 'src/core/ must stay framework-free. See the rule for "vue".',
                        },
                    ],
                    patterns: [
                        {
                            group: ['../components/*', '../composables/*', '*.vue'],
                            message:
                                'src/core/ must not point at the Vue layer; the dependency ' +
                                'runs the other way.',
                        },
                    ],
                },
            ],
        },
    }
);
