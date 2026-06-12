# Shipline

[![Deploy GitHub Pages](https://github.com/mangust5580/Shipline/actions/workflows/deploy.yml/badge.svg)](https://github.com/mangust5580/Shipline/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/mangust5580/Shipline)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Live Demo](https://img.shields.io/badge/live-demo-2ea44f)](https://mangust5580.github.io/Shipline/)

Портфолио-проект в формате SaaS landing page для вымышленной платформы аналитики релизов, изменений и delivery-метрик.

> **Демонстрационный проект.** Весь контент, контакты, юридические страницы и сценарии формы являются вымышленными. Форма не отправляет и не сохраняет реальные данные — backend и сторонние form-сервисы не используются. Реальных клиентских данных, NDA-материалов и production-бизнес-информации в проекте нет.

---

## Состав проекта

- Главная страница: Hero, Features, Workflow, Audience, Pricing, FAQ, Contact CTA.
- Страница политики конфиденциальности.
- Страница условий использования.
- Кастомная 404-страница для GitHub Pages.
- Демо-модалка заявки с валидацией.
- Адаптивная вёрстка от 320px до 1920px.
- GitHub Pages деплой через GitHub Actions.

---

## Quality checks

- `npm run build` — passes.
- `npm run lint` — passes (ESLint + Stylelint, 0 errors).
- `npm run check` — passes (lint + full build).
- Final GitHub Pages readiness audit: passed.

---

## Сборка

Gulp pipeline обрабатывает HTML-партиалы (PostHTML), Tailwind CSS v4, JavaScript ES-модули, изображения AVIF/WebP/PNG @2x, SVG sprite, favicons, sitemap и robots.txt.

Production output: `public/`

GitHub Actions workflow собирает проект и деплоит `public/` на GitHub Pages.

---

## Стек

- HTML-партиалы с includes / PostHTML
- Tailwind CSS v4 — CSS-first, без `tailwind.config.js`
- CSS custom properties — design tokens в `src/styles/tokens.css`
- Vanilla JavaScript ES-модули
- Gulp 5 pipeline
- SVG sprite для UI-иконок
- Responsive image pipeline: AVIF / WebP / PNG, @2x assets
- Manrope variable font
- ESLint, Stylelint, Prettier
- GitHub Actions + GitHub Pages

---

## Требования

- Node.js >= 20
- npm

---

## Команды

```bash
npm ci                # установить зависимости

npm run dev           # дев-сервер с watch
npm run build         # production build → public/
npm run build:fast    # быстрая сборка без полного image pipeline
npm run lint          # ESLint + Stylelint
npm run check         # lint + production build
npm run preview       # preview production build
```

---

## Публикация

| | |
|---|---|
| Репозиторий | https://github.com/mangust5580/Shipline |
| Live Demo | https://mangust5580.github.io/Shipline/ |
| Workflow | `.github/workflows/deploy.yml` |
| Publish directory | `public/` |
| GitHub Pages source | GitHub Actions |
