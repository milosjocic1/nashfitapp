// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Must stay last: turns off ESLint rules that would fight Prettier.
  // Prettier owns formatting; ESLint owns correctness.
  eslintConfigPrettier,
  {
    // supabase/functions is Deno — different globals and module resolution,
    // linted by the Deno toolchain rather than the app's ESLint config.
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/*'],
  },
]);
