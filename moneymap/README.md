# 💸 MoneyMap Frontend & API Application

This directory contains the Next.js application for **MoneyMap**, built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and Supabase.

For full project architecture, features, database schema, and API documentation, please refer to the primary repository [README](../README.md).

## Quick Start

### 1. Install dependencies:
```bash
npm install
```

### 2. Configure environment:
Copy `.env.example` to `.env.local` and configure your Supabase and Google OAuth keys:
```bash
cp .env.example .env.local
```

### 3. Start development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` – Starts the Next.js development server
- `npm run build` – Builds the application for production
- `npm run start` – Starts the Next.js production server
- `npm run lint` – Runs ESLint code quality checks
