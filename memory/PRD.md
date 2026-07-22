# WebBuilder OS - PRD

## Original Problem Statement
Build WebBuilder OS - a complete enterprise AI Business Operating System combining CRM, ERP, HRM, Finance, Projects, Documents, Communication, Calendar, Analytics, AI Assistant, Website Builder, Customer Support, Admin Portal, Founder Office, Client Portal, Design Studio and all business management modules into one unified platform. Must be modular, scalable, customizable, multi-tenant, secure, production-ready with premium enterprise SaaS dark-first design (Linear/Notion/Stripe inspired).

## User Choices
- **MVP Approach**: Foundation-first (architecture, DB, auth, RBAC, reusable components, design system) then progressive modules
- **AI Integration**: OpenAI GPT-5.2 + Claude Sonnet 4.6 (Emergent LLM Key)
- **Auth**: JWT-based custom auth + Google OAuth (Emergent-managed)
- **Storage**: Object storage (production-grade)
- **Design**: Premium enterprise SaaS, dark theme default, Linear/Notion/Stripe inspired, custom Design Studio

## Architecture (Implemented)

### Backend (`/app/backend/`)
- **server.py** — FastAPI with `/api` prefix, CORS, all module routes
- **models.py** — Pydantic models: User, Organization, Role, Client, Lead, Deal, Project, Task, Document, File, Employee, Department, Attendance, Leave, Transaction, Invoice, Message, Event, Ticket, AIConversation, Workspace, Notification
- **auth.py** — JWT + bcrypt password hashing, session management, RBAC helpers (check_permission, require_permission)
- **Emergent Auth** integrated for Google OAuth via `/api/auth/session`
- **Object Storage** initialized on startup via Emergent Storage API
- **AI Chat** via emergentintegrations library (streaming SSE) supporting OpenAI, Anthropic, Gemini

### Frontend (`/app/frontend/src/`)
- **Design system**: Dark theme (default) + Light mode, Outfit (headings), Manrope (body), JetBrains Mono (data)
- **Colors**: Zinc-based palette with indigo (#4F46E5) accent, semantic tokens for surface/border/success/warning/error
- **Tailwind config**: Custom rgb(var(--...)) tokens for full alpha support
- **Auth**: JWT + Google OAuth flow with AuthCallback (session_id URL fragment handling), AuthContext, ProtectedRoute
- **Layout**: Fixed sidebar (240px) with 11 module nav links + Admin Portal, sticky header with search/notifications/user menu/logout
- **Pages**: Login, Register, Dashboard, CRM (Clients + Leads with create modal), Projects (with create modal), placeholder pages for other modules

## Users & Personas
- **Owner/Admin**: Full platform access, manages users, roles, organizations, system settings
- **Manager**: Manages team, projects, clients, approvals
- **Employee**: Uses assigned modules, submits work, collaborates
- **Client**: Views assigned projects, deliverables, invoices via Client Portal (future)

## Core Requirements (Static)
- Multi-tenant SaaS platform with tenant isolation
- Role-based access control with granular permissions
- Real-time updates and notifications
- Enterprise security: encryption, MFA, audit logs, session management
- Responsive design (desktop, tablet, mobile)
- Every module integrates with every other module
- Modular, scalable, no isolated features

## What's Been Implemented (2026-02-XX)
✅ Foundation architecture (backend + frontend)
✅ Design system with dark/light theme, custom fonts, semantic color tokens
✅ Authentication: JWT + email/password + Google OAuth (Emergent Auth)
✅ Session management with database storage + httpOnly cookie support
✅ RBAC framework (roles, permissions, check_permission, require_permission)
✅ Object storage integration (Emergent Storage API)
✅ Complete database models for 20+ entities
✅ Reusable layout: Sidebar (11 modules + Admin), Header (search, notifications, user menu, logout), MainLayout
✅ Login page (dark, split-screen with branding image)
✅ Register page (dark, split-screen with branding image)
✅ Dashboard with stat cards, quick actions, recent activity (Bento grid layout)
✅ CRM: Clients + Leads with create modal, tabs, stats, list view
✅ Projects: Project cards with progress bars, create modal, stats
✅ AI Chat backend endpoint (streaming SSE) - OpenAI + Claude via Emergent LLM Key
✅ File upload/download via object storage
✅ 100% test pass rate (backend 10/10 + frontend E2E all critical flows)

## Prioritized Backlog

### P0 (Next iteration)
- **AI Assistant UI**: Chat interface with streaming, model switcher (GPT-5.2/Claude Sonnet 4.6), conversation history
- **Documents module**: Rich editor, file upload UI, folder tree, version control
- **Admin Portal**: User management table, roles/permissions UI, org settings

### P1
- **HR module**: Employees, Departments, Attendance, Leave with approval workflow
- **Finance**: Invoices, Transactions, Payments, Expenses with PDF export
- **Calendar**: Events, Meetings, day/week/month views
- **Analytics**: Charts (Recharts), Reports, KPI dashboards

### P2
- **Communication**: Chat, DMs, channels, notifications
- **Customer Support**: Tickets, Knowledge Base, SLA tracking
- **Founder Office**: Executive dashboard, Strategy center, Discussion room
- **Design Studio**: No-code branding, page builder, theme customization
- **Website Builder**: Drag & drop, templates, deployment
- **Client Portal**: Project access, feedback, approvals, invoices

## Test Credentials
`admin@webbuilder.com` / `Admin@123` (auto-created on backend startup, role=owner)

## Next Tasks
1. Build AI Assistant UI with streaming chat
2. Build Documents module with rich editor + file upload
3. Build Admin Portal for user/role/permission management
4. Progressively add HR, Finance, Calendar, Analytics modules
5. Add Design Studio for no-code customization
