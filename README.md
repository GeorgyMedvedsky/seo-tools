# redirector-nginx

Генератор redirect-конфигов для nginx/Apache — первый инструмент будущей единой SEO-платформы.

## Стек

- React 19 + TypeScript
- Vite 8, SCSS Modules
- React Router
- Feature-Sliced Design
- Vitest + Testing Library
- ESLint, Stylelint, html-validate, markdownlint-cli2, editorconfig-checker
- Husky + lint-staged + Commitlint (Conventional Commits)

## Установка и первый запуск

```text
npm install
npm run dev
```

Дев-сервер поднимется на `http://localhost:5173`.

## Команды

```text
npm run dev - дев-сервер
npm run build - продакшн-сборка
npm run preview - предпросмотр собранного билда
npm run typecheck - проверка типов
npm run format - форматирование Prettier
npm run format:check - проверка форматирования без изменений
npm run check:editorconfig - проверка соответствия .editorconfig
npm run lint - ESLint (TS/TSX/JSON/YAML)
npm run lint:fix - ESLint с автофиксом
npm run lint:styles - Stylelint (CSS/SCSS)
npm run lint:styles:fix - Stylelint с автофиксом
npm run lint:html - html-validate
npm run lint:md - markdownlint-cli2
npm run lint:md:fix - markdownlint-cli2 с автофиксом
npm run lint:fsd - Steiger
npm run test - Vitest
npm run test:watch - Vitest в watch-режиме
npm run test:coverage - Vitest с отчётом покрытия
npm run verify - вся цепочка проверок разом
```

Git-хуки (Husky) часть этого делают автоматически: `pre-commit` чинит застейдженные файлы (`lint-staged`), `commit-msg` проверяет сообщение коммита (Conventional Commits), `pre-push` запускает `verify`.
