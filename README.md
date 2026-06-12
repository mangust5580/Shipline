# Shipline [![Deploy GitHub Pages](https://github.com/mangust5580/Shipline/actions/workflows/deploy.yml/badge.svg)](https://github.com/mangust5580/Shipline/actions/workflows/deploy.yml) [![License](https://img.shields.io/github/license/mangust5580/Shipline)](LICENSE) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js\&logoColor=white)](package.json) [![Live demo](https://img.shields.io/badge/live-demo-2ea44f)](https://mangust5580.github.io/Shipline/)

Shipline — портфолио-проект в формате многостраничного SaaS-сайта для вымышленной платформы аналитики релизов, изменений и delivery-метрик.

Проект сделан как витринная работа: он показывает семантическую HTML-разметку, Tailwind CSS v4, дизайн-токены, адаптивные изображения, модальные сценарии, базовую доступность, SEO-метаданные и production-oriented сборку статического сайта.

Контент, контакты, юридические страницы и сценарии формы являются демонстрационными. Форма не отправляет и не сохраняет реальные данные: backend и сторонний form service не используются. Реальных клиентских данных, NDA-материалов и production-бизнес-информации в проекте нет.

## Состав проекта

* Главная страница с hero-блоком, ключевыми функциями, workflow, аудиториями, тарифами, FAQ и контактным CTA.
* Страница политики конфиденциальности.
* Страница условий использования.
* Кастомная страница 404 для GitHub Pages.
* Демо-модалка заявки с валидацией формы.
* Адаптивная вёрстка от 320px.
* Подготовка к публикации на GitHub Pages через GitHub Actions.

## Quality checks

* Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
* `npm run build` passes.
* `npm run lint` passes.
* `npm run check` passes.

## Сборка

Проект использует кастомную Gulp 5 сборку для статического сайта.

Сборка обрабатывает HTML-шаблоны, Tailwind CSS v4, JavaScript-модули, изображения, SVG-иконки, favicon, sitemap, robots.txt и production-артефакты для GitHub Pages.

Production output: `public/`.

GitHub Actions workflow собирает проект и деплоит `public/` на GitHub Pages.

## Стек

* HTML-шаблоны с includes / PostHTML partials.
* Tailwind CSS v4 в CSS-first режиме, без `tailwind.config.js`.
* CSS custom properties для дизайн-токенов.
* Tailwind utilities в HTML для presentation layer.
* Vanilla JavaScript ES-модули.
* Gulp 5 pipeline.
* Оптимизация изображений и генерация responsive AVIF / WebP / PNG.
* Оптимизация SVG и генерация SVG-спрайта.
* Manrope variable font.
* ESLint, Stylelint, Prettier.
* GitHub Actions и GitHub Pages.

## Требования

Node.js `>=20`.

## Команды

```bash
npm ci
npm run dev
npm run build
npm run build:fast
npm run lint
npm run check
npm run preview
```

`npm run dev` запускает dev-сервер в watch-режиме.
`npm run build` создаёт production-сборку в `public/`.
`npm run build:fast` запускает быструю сборку без полного image pipeline.
`npm run lint` запускает ESLint и Stylelint.
`npm run check` запускает линтеры и полную production-сборку.
`npm run preview` локально поднимает production-сборку.

## Публикация

Проект подготовлен для публикации на GitHub Pages.

| Параметр            | Значение                                  |
| ------------------- | ----------------------------------------- |
| Репозиторий         | `https://github.com/mangust5580/Shipline` |
| Live demo           | `https://mangust5580.github.io/Shipline/` |
| Workflow            | `.github/workflows/deploy.yml`            |
| Publish directory   | `public/`                                 |
| GitHub Pages source | GitHub Actions                            |

## Production

Проект готов для статического хостинга на GitHub Pages. Для реального коммерческого продукта нужно заменить демо-контакты, юридический текст и обработку формы на production-данные и backend-интеграцию.
