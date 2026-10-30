# Project Architecture & File Division

This document catalogs and divides all files in the project (**physi-log-book-src**) into **Frontend**, **Backend / Database**, and **Configuration / Tooling / Shared Infrastructure**.

---

## 🖥️ 1. Frontend Files (Client-Side)

These files execute in the user's browser, responsible for rendering UI components, state management, animations, styles, routing, and client-side interactions.

### 🌐 Pages & Routes (`src/routes/`)
- [`src/routes/__root.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/__root.tsx): Root layout wrapper for HTML documents, head metadata, scripts, and theme providers.
- [`src/routes/index.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/index.tsx): Public landing page view.
- [`src/routes/login.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/login.tsx): Authentication sign-in page.
- [`src/routes/reset-password.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/reset-password.tsx): Password recovery interface.
- [`src/routes/_authenticated.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/_authenticated.tsx): Protected route container for signed-in sessions.
- [`src/routes/_authenticated/admin.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/_authenticated/admin.tsx): Administrator dashboard page.
- [`src/routes/_authenticated/faculty.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/_authenticated/faculty.tsx): Faculty evaluation and grading dashboard.
- [`src/routes/_authenticated/student.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routes/_authenticated/student.tsx): Student logbook entry and portal interface.

### 🧩 UI Components (`src/components/`)
- [`src/components/app-shell.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/app-shell.tsx): Main layout navigation frame, sidebars, and user profile header.
- [`src/components/batch-manager.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/batch-manager.tsx): Batch creation and management modal.
- [`src/components/change-password.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/change-password.tsx): User password change dialog.
- [`src/components/edit-web.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/edit-web.tsx): In-app website content editor component.
- [`src/components/journal-preview.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/journal-preview.tsx): Student physiology logbook preview renderer.
- [`src/components/practical-template-manager.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/practical-template-manager.tsx): Template creator for physiology practical experiments.
- [`src/components/profile-photo.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/profile-photo.tsx): Avatar and profile image uploader.
- [`src/components/submission-dates.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/submission-dates.tsx): Submission deadline and window scheduler widget.
- [`src/components/viva-questions.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/viva-questions.tsx): Interactive viva question bank interface.
- [`src/components/website-content.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/website-content.tsx): Dynamic website content viewer.
- [`src/components/ui/`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/components/ui): Reusable Radix UI & Tailwind component library (buttons, inputs, dialogs, selects, dropdowns, tables, cards, toasts).

### 🎨 Styling, Client State & Hooks
- [`src/styles.css`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/styles.css): Global CSS stylesheets, Tailwind CSS v4 variables, and custom design tokens.
- [`src/hooks/use-mobile.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/hooks/use-mobile.tsx): Responsive screen-width detector hook.
- [`src/router.tsx`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/router.tsx): Client-side TanStack router instantiator.
- [`src/routeTree.gen.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/routeTree.gen.ts): Auto-generated route tree for type-safe navigation.
- [`src/integrations/supabase/client.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/client.ts): Browser Supabase client instance (handles user session in localStorage).
- [`src/integrations/supabase/previewAuthStorage.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/previewAuthStorage.ts): Client-side session and auth storage adapter.

### 🖼️ Static Public Assets (`public/` & `src/assets/`)
- [`public/favicon.ico`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/public/favicon.ico): Site icon.
- [`public/robots.txt`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/public/robots.txt): Crawler indexing directions.
- [`public/placeholder.svg`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/public/placeholder.svg): Placeholder image.
- [`src/assets/`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/assets): Static bundled image resources.

---

## ⚙️ 2. Backend & Database Files (Server-Side)

These files handle database definitions, access control policies, server endpoints, server authentication, and background jobs.

### 🗄️ Database Schemas & SQL Migrations (`drizzle/` & `supabase/`)
- [`drizzle.config.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle.config.ts): Drizzle ORM configuration for database migrations and schema outputs.
- [`drizzle/migrations/0000_create_physiology_core_schema.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0000_create_physiology_core_schema.sql): Initial database schema (users, roles, practicals, submissions, assessments).
- [`drizzle/migrations/0001_add_practical_templates_and_profile_fields.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0001_add_practical_templates_and_profile_fields.sql): Practical templates & student profile schema.
- [`drizzle/migrations/0002_add_find_login_email_function.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0002_add_find_login_email_function.sql): PostgreSQL stored function for email resolution.
- [`drizzle/migrations/0003_expand_journal_template_editor.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0003_expand_journal_template_editor.sql): Journal template editor schema extensions.
- [`drizzle/migrations/0004_restrict_self_service_staff_roles.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0004_restrict_self_service_staff_roles.sql): RLS security rules for role modifications.
- [`drizzle/migrations/0005_submission_attachment_storage_policies.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0005_submission_attachment_storage_policies.sql): Cloud Storage RLS rules for student submission attachments.
- [`drizzle/migrations/0006_student_holds_profile_photo_submission_window.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0006_student_holds_profile_photo_submission_window.sql): Student status flags and submission cut-off window checks.
- [`drizzle/migrations/0007_profile_photos_read_policy.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0007_profile_photos_read_policy.sql): Storage access rules for profile photos.
- [`drizzle/migrations/0008_enable_realtime_portal_sync.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0008_enable_realtime_portal_sync.sql): Supabase Realtime publication setup.
- [`drizzle/migrations/0009_student_growth_rank.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0009_student_growth_rank.sql): Performance calculations & ranking schema.
- [`drizzle/migrations/0010_faculty_manage_batches.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0010_faculty_manage_batches.sql): Faculty batch assignment tables & RLS.
- [`drizzle/migrations/0011_faculty_cannot_read_other_faculty.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0011_faculty_cannot_read_other_faculty.sql): Tenant isolation RLS policies between faculty members.
- [`drizzle/migrations/0012_viva_question_bank.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0012_viva_question_bank.sql): Question bank data schema.
- [`drizzle/migrations/0013_journal_assessment_default_five.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0013_journal_assessment_default_five.sql): Scoring defaults and grading logic constraints.
- [`drizzle/migrations/0014_admin_website_content.sql`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/drizzle/migrations/0014_admin_website_content.sql): Dynamic CMS table schema.
- [`supabase/config.toml`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/supabase/config.toml): Supabase local server environment configuration.

### 🚀 Server Endpoints & Backend Execution (`src/` & `src/lib/`)
- [`src/server.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/server.ts): Nitro / SSR backend server request pipeline handler.
- [`src/start.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/start.ts): TanStack Start server bootstrap and middleware entry point.
- [`src/integrations/supabase/client.server.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/client.server.ts): Privileged server-side Supabase client (bypasses RLS using service role secret).
- [`src/integrations/supabase/auth-middleware.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/auth-middleware.ts): Server-side authentication and JWT verification middleware.
- [`src/integrations/supabase/cron-auth.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/cron-auth.ts): Token verification for scheduled background cron jobs.
- [`src/integrations/supabase/auth-attacher.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/auth-attacher.ts): Injects verified session data into server requests.
- [`src/lib/admin.functions.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/admin.functions.ts): Server RPC actions (batch student registration, password reset commands).

---

## 🔄 3. Shared Library & Business Logic (`src/lib/`)

These TypeScript files contain data models, validation schemas, or utilities utilized across both frontend components and server routes:

- [`src/integrations/supabase/types.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/integrations/supabase/types.ts): Auto-generated database typings shared across client and server.
- [`src/lib/assessment.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/assessment.ts): Practical assessment grading formulas and validations.
- [`src/lib/batch-id.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/batch-id.ts): Batch code formatting and validators.
- [`src/lib/journal-template.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/journal-template.ts): Shared logbook template parser and structure definitions.
- [`src/lib/submission-window.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/submission-window.ts): Submission cutoff timestamp calculations.
- [`src/lib/realtime.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/realtime.ts): Supabase channel subscriptions for live data synchronization.
- [`src/lib/website-text-catalog.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/website-text-catalog.ts): Content keys, default copy, and site text catalogue.
- [`src/lib/utils.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/lib/utils.ts): Shared CSS `cn()` class merger utility.

---

## 🛠️ 4. Build, Config & Tooling

Project configuration, linting, packaging, and testing files:

- [`package.json`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/package.json): Defines npm scripts, frontend dependencies (React 19, Radix UI), and backend dependencies (Nitro, Drizzle, Supabase).
- [`bun.lock`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/bun.lock) & [`bunfig.toml`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/bunfig.toml): Bun package manager lockfile and runtime configuration.
- [`vite.config.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/vite.config.ts): Vite build orchestrator, TanStack Router plugin, and Tailwind CSS configuration.
- [`tsconfig.json`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/tsconfig.json): TypeScript compilation options and path aliases (`@/*`).
- [`eslint.config.js`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/eslint.config.js): Code style and linting rules.
- [`vitest.config.ts`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/vitest.config.ts) & [`src/test/`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/src/test): Unit and integration testing configuration and suites.
- [`components.json`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/components.json): shadcn/ui component CLI configuration.
- [`README.md`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/README.md) & [`roadmap.md`](file:///c:/Users/BGSMCH/Desktop/record/physi-log-book-src/roadmap.md): Project overview and developmental roadmap.
