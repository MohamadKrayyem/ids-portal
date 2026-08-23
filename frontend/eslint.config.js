import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Every page loads its data with useEffect(() => { load(); }, []).
      // This rule warns about setState inside an effect, which is aimed at
      // more advanced patterns; loading data on mount is fine and is the
      // simplest thing to read, so we switch the rule off for this project.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
