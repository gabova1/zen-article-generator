# Яндекс Дзен Генератор

## Overview

A full-stack web application for generating high-quality SEO-optimized articles for Yandex Zen platform using AI (OpenRouter API).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenRouter API (meta-llama/llama-4-maverick:free model)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Features

- AI-powered article generation (topic, category, type, keywords, tone, length)
- SEO optimization (meta title, description, keywords)
- HTML and Markdown export/copy
- Article history with pagination
- Statistics dashboard (by category, type, word count, reading time)
- Dark mode support
- Affiliate link support for product articles

## Database Schema

- `articles` table: id, topic, title, content (HTML), excerpt, seoTitle, metaDescription, keywords (jsonb), category, articleType, imageDescriptions (jsonb), wordCount, readingTime, productUrl, createdAt

## Key Files

- `artifacts/dzen-generator/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `artifacts/api-server/src/lib/openrouter.ts` — OpenRouter AI integration
- `artifacts/api-server/src/routes/articles.ts` — Article API routes
- `lib/db/src/schema/articles.ts` — Database schema
- `lib/api-spec/openapi.yaml` — OpenAPI spec

## Environment Variables

- `OPENROUTER_API_KEY` — OpenRouter API key (shared)
- `DATABASE_URL` — PostgreSQL connection string

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
