export default {
  '*.{ts,tsx,js,cjs,mjs,json,jsonc,yml,yaml}': ['eslint --fix', 'prettier --write'],
  '*.{css,scss}': ['stylelint --fix', 'prettier --write'],
  '*.html': ['html-validate', 'prettier --write'],
  '*.md': ['markdownlint-cli2 --fix', 'prettier --write'],
  '*.{ts,tsx,js,cjs,mjs,json,jsonc,yml,yaml,css,scss,html,md}': ['editorconfig-checker'],
};
