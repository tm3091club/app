# Toastmasters Monthly Scheduler — Master Spec & Implementation Manual

## 0) Purpose & Audience
This document is the source of truth for how the Toastmasters app should behave. It’s written for engineers and AI copilots who will read/modify code. Its goal is consistency and safety: preserve logic, data model, and UX while allowing incremental improvements.

## 1) Tech Stack & Core Modules
- **Frontend:** React 19 + TypeScript, Tailwind, Vite. PWA enabled (manifest, apple touch icon, theme color). Print styles for agendas/schedules are included.
- **Backend:** Firebase
  - Auth (Email/Password only)
  - Firestore (all persistent data)
  - Extensions/Functions: Outbound email via Firebase extension (club invitations, notifications)
  - PDF/Sheets: jsPDF + autotable for PDF; TSV for Google Sheets export.
- **Versioning:** Automatic date-and-push counter displayed in footer (e.g., 9.17.25-2). Do not remove.

## 2) Multitenancy Model & Identities
- **Tenant = Club.** Each club is administered by a “club admin” (the initial user).
- **ownerId/clubId:** Every entity references the owning club. Do not read/write outside the current ownerId/clubId.
- **Users & Members:**
  - users are Firebase Auth accounts (admins or members).
  - members are the scheduling entities (can exist before the person signs up).
  - Linking happens when an invited person creates an account; their Firebase uid is recorded on the member.
- **Officer roles** are assigned to admins, with President → VPE fallback if the President is unavailable for a meeting. Keep this logic stable. (Roles are defined in constants and types; see codebase.)

## 3) Firestore Data Model (current, keep stable)
Top-level collections (names must remain stable unless migrated safely):
- **invitations** — pending invites sent via email. Status: pending/accepted/revoked.
- **mail** — Firebase email extension write-in collection.
- **notifications** — per-user notifications (role reminders, open roles, blackout, etc.).
- **publicSchedules / publicAgendas** — read-only shared docs (live views).
- **users** — application users (club admins and members) with per-club scoping.

Per club (via ownerId / club profile):
- **Organization (Club Profile)** — stores:
  - name, district, clubNumber, ownerId (the creator’s uid), meetingDay (0–6), timezone (IANA), autoNotificationDay (1–28)
  - adminInfo (email, uid)
- **members** (denormalized snapshot to speed UI; contains: id, name, email?, joinedDate, status, qualifications, uid?, role (Admin|Member), and officerRole?)
- **Members** — canonical list used by the schedule:
  - id (deterministic string), name, status (Active|Possible|Unavailable|Archived), joinedDate, ownerId, uid?
  - Qualifications booleans: isToastmaster, isTableTopicsMaster, isGeneralEvaluator, isPastPresident
  - officerRole? (for President/VPE logic)
- **Availability** — per member, keyed by ISO YYYY-MM-DD meeting date to Available|Possible|Unavailable.
- **Schedules** — per month (id: YYYY-MM, year, month (0-indexed), isShared?, shareId?):
  - meetings[]: each with date (ISO), theme, assignments{ role: memberId|null }, isBlackout?
  - ownerId (club scope)
- **WeeklyAgendas** — per week index within the month:
  - Items (~37 rows) with fields for time, program event, “key role”, person, description, color. Also contains theme, shareId, scheduleId, ownerId, next meeting preview, timestamps.
  - Note: A legacy LastJoinToken field exists; preserve for compatibility (do not delete silently). If deprecating, mark as optional and leave reads tolerant of its absence.

## 4) Roles & Scheduling Canon
- **Role Lists (source of truth)**
  - All roles (order matters for UI and exports): President, Pledge, Thought of the Day, Toastmaster, Grammarian, Timekeeper, Ah-Counter, Ballot Counter, Table Topics Master, Evaluator 1, Speaker 1, Evaluator 2, Speaker 2, Evaluator 3, Speaker 3, General Evaluator, Inspiration Award.
  - Major roles: President, Toastmaster, Table Topics Master, General Evaluator, Speaker 1–3, Inspiration Award.
  - Minor roles: Pledge, Thought of the Day, Grammarian, Timekeeper, Ah-Counter, Ballot Counter, Evaluators 1–3. (These are encoded in Constants.ts and must not drift.)
- **Qualification checks**
  - Toastmaster requires isToastmaster.
  - Table Topics Master requires isTableTopicsMaster.
  - General Evaluator requires isGeneralEvaluator.
  - Inspiration Award uses isPastPresident gate (as shipped).
- **Officer fallback**
  - President of the club is placed as President by default. If unavailable that week, VPE fills President automatically. Otherwise unassigned and must be manually filled. (Keep this precise behavior.)

## 5) Permissions Matrix
| Action | Admin | Member |
| --- | --- | --- |
| Create/Delete monthly schedule | ✅ | ❌ |
| Toggle Blackout | ✅ | ❌ |
| Edit meeting Theme | ✅ | ❌ |
| Assign roles for anyone | ✅ | ❌ |
| Self-assign to unassigned roles (if qualified) | — | ✅ |
| Unassign self (with speaker warning) | — | ✅ |
| Edit Weekly Agenda | ✅ and the week’s Toastmaster | ❌ |
| Change availability | Can edit anyone | Only own (if linked) |

Additional constraints:
- On a change to a major role, remove the member from any other major role in the same meeting.
- Members see themselves labeled subtly (e.g., “me”/blue highlight) and cannot assign others.
- Blackout clears visible assignments (saved in hidden property for restore) and prevents edits; un-blackout restores.

## 6) Date/Time Rules
- month stored as 0-indexed (Jan = 0). Display with toLocaleString based on club timezone when appropriate.
- Meeting dates are all occurrences of the club’s meeting day in that month.
- Many UI displays use toLocaleDateString(..., { timeZone:'UTC' }) to stabilize date-only output — keep that pattern to avoid off-by-one from local offsets.
- Availability keys are ISO dates YYYY-MM-DD derived from the meeting date (split at 'T' as in the current code).
- Utility references: getCurrentMonthInfo, getNextMonthInfo, getRelevantMonthsForAvailability, getNextScheduleMonth—respect their 0-indexing and rollover behavior.

## 7) Invitations & Linking
- Admins can pre-create members without emails. Those members are fully assignable by admins.
- **“Link Account” flow:**
  - Search for existing unlinked account by name/email; if not found, send invitation via Firebase email extension.
  - Invitation creates an invitations doc with token; when user signs up, we store their uid on the member.
  - Keep Pending to be Linked UI: resend invite, change email, remove invitation (which can also remove the member if appropriate).
  - Unlink remains available for edge cases—do not remove.

## 8) Notifications
- **Types include:**
  - Schedule Published, Role Reminder (next meeting), Availability Request (for next month, on autoNotificationDay), Role Changed / Unassigned, Meeting Blackout, Speaker Unassigned (notify evaluator).
  - Use the provided notificationService functions and keep existing templates/behavior.
  - Unsubscribe route exists. Keep it functional and outside auth.

## 9) Sharing & Export
- Share generates a live, read-only URL under `tmapp.club/#/<clubNumber>/share/<token>` for monthly schedules, and `.../agenda/<token>` for weekly agendas. Visitors see public pages with club name, schedule/agenda, and print/export buttons.
- **Export:**
  - PDF: jsPDF autotable, landscape, fixed role column and up to four meeting columns, colored availability blocks. Keep one-page weekly agenda output.
  - Sheets (TSV): clipboard with tab-separated values, aligned to the visible schedule.
- Print styles are tuned in `styles/WeeklyAgenda.css` and inline styles on public pages. Preserve red highlights for voting rows and blues for highlights when printing.

## 10) UX Flows
- **Auth:**
  - Landing shows “Sign in” and “or Create a New Club”.
  - Signup (new club): club name, district (from Toastmasters list), club number (free text), meeting day, email, password (+ confirm).
  - Email confirmation: Required (add if missing); ensure no spam signups.
  - First-time club: After signup, redirect to Manage Members (not Schedule). Provide tooltips:
    - “Add New Member” (name, status, qualifications)
    - Set Join Date (affects speaker ordering for fairness: newest speak earlier)
    - Per-week Availability for current/next month.
- **Schedule Manager (default thereafter):**
  - Dropdown to select existing month; special “Prepare Next/Previous” if absent.
  - Buttons: Generate Schedule, Share, Export (PDF/TSV), Compare with Previous Month.
  - Table: sticky Role column; columns per meeting date; Blackout checkbox in header cell per meeting; theme row; role rows; bottom “Availability” lists (Available/Possible/Unavailable).
- **Weekly Agenda:**
  - Select Week (auto-selects current week).
  - Edit Agenda (admins and that week’s Toastmaster): time, event, person, description, color, reordering.
  - Share → live link with “Print Agenda” and “Visit Main App”.
  - Export as one-page PDF.
- **Profile (Club Profile & My Profile):**
  - Club Profile: change display fields, timezone, meeting day, auto notification day. Trigger Role Reminders and Availability Request.
  - Team Management: assign Officer roles; ensure “No Officer Role” disappears when all are filled; remove role via ❌.
  - Security actions: change email/password with reauth; send password reset to members.
  - Notifications bell: opens panel with unread/read, navigate to availability, fetch previous notifications.

## 11) Security & Rules-of-Engagement
- Firestore reads/writes must be restricted by ownerId/clubId. Admins of a club can manage only their club. Members can only modify self data (availability; self-assign where allowed).
- Never expose other clubs’ data in any list or query.
- Public share docs contain only what’s needed for view; use a denormalized publicMembers[] with id and name only.

## 12) PWA, Accessibility, and Print
- **PWA:** must be installable on iOS Safari; full-screen icon; dark mode respected.
- **Accessibility:** semantic headings, focus rings, adequate contrast; all actionable icons have text or title.
- **Print:** keep one-page agenda; preserve highlight colors (especially red voting rows); remove sticky behavior for printed role column (already handled in CSS).

## 13) Versioning & Build
- Footer displays APP_VERSION from utils/version.ts.
- The auto bump script (scripts/update-version.js) + git hooks set M.DD.YY-X.
- **NPM scripts:**
  - npm run dev, npm run build, npm run preview
  - npm run version:update, npm run push (update version and push)
- Do not remove or bypass the version display in app or on public pages.

## 14) Guardrails Against Logic Drift
**Do NOT:**
- Change database vendor or add new persistent stores.
- Rename existing fields/collections (e.g., members, schedules, weeklyAgendas, publicSchedules, publicAgendas, invitations) without a migration plan.
- Alter canonical role order/names or officer fallback behavior.
- Break the member-can-only-self-assign rule.
- Change “blackout” semantics (must preserve/restore assignments).

**If you must extend:**
- Add new optional fields (never remove old ones silently).
- Add derived/denormalized documents (e.g., public*) only for display/performance, not as new sources of truth.
- Produce a Migration Plan (staged, reversible, with telemetry).

## 15) Suggested Future Improvements (safe, staged)
- Club identity hardening: Introduce explicit clubId (UUID) distinct from ownerId; keep ownerId for backwards compat. Dual-write for one release; backfill all docs; then read-prefer clubId.
- Memberships table (multi-club members):
  - New collection memberships mapping { userUid, clubId, memberId, role }.
  - UI: add club switcher for users linked to multiple clubs.
  - Keep current behavior fully working; this is additive.
- Indexes: Add composite indexes for schedule queries by ownerId + year + month, and for public docs by clubNumber + shareId.
- Email confirmations: On club creation, require email verification and throttle new-club creation from the same IP/email.
- Mentorship module: Add mentors collection { clubId, mentorId, menteeIds[], channels[], availability[] } and booking emails.
- Deprecate LastJoinToken: Mark as legacy; add null-tolerant reads; remove usage over time after audit.
- UTC consistency check: Audit all places dates are created/parsed; enforce a single utility to derive the dateKey and to format meeting headers with the club’s timezone for display and UTC for “date-only” operations.
- All of the above must follow the migration discipline described earlier.

## 16) Test Plan (minimum)
- Mobile Safari + Desktop Chromium/Firefox:
  - Auth → New Club → Redirect to Manage Members.
  - Add member, set qualifications, set availability current/next month.
  - Generate schedule (no crashes with empty historical data).
  - Self-assign as member (qualified, unassigned role).
  - Admin reassigns roles; major-role exclusivity enforced.
  - Blackout toggles & restores assignments; notification fires for blackout.
  - Share schedule & agenda: links open read-only, reflect live changes.
  - Export PDF (landscape; per-column widths; colors) & TSV (clipboard).
  - Weekly agenda remains one page in print.
  - Notifications: role reminder, availability request, role changed, speaker unassigned (evaluator notified).
  - Version footer visible on app and public pages.

## 17) Naming & Code Style
- Types live in types.ts; roles in Constants.ts. Do not fork enums/role arrays elsewhere.
- Month helpers in utils/monthUtils.ts drive UI text and date math—respect 0-index months and rollover logic.
- Keep components accessible and Tailwind classes consistent with existing patterns; reuse shared UI (confirmation/tooltip/share modals).

## 18) Known Quirks (keep compatible)
- Date-only keys rely on meetingDate.toISOString().split('T')[0]—continue using the same approach to match existing availability documents.
- Public pages often format with timeZone: 'UTC' to stabilize display; retain unless changing comprehensively with tests.
- The “Inspiration Award” qualification piggybacks on isPastPresident—keep as-is unless owner requests change.

## 19) Operational Notes
- Email sender is the Firebase extension account (tmprofessionallyspeakingatgmail.com as configured). Keep templates respectful and short.
- Tooltips should guide first-time admins (add member, set availability, generate schedule).
- When too many available members, unassigned but available names appear in the Availability panel so Toastmaster can hand-pick.

## 20) Roadmap Tags (not commitments)
- Mentorship area (directory, preferences, booking, email notices).
- Club SOP ingestion for schedule guidance.
- Calendar sync (optional, opt-in).

---

## UX & Theming Guidelines

- **Cross-Platform Parity:**
  - Any change to the webapp must be verified for both desktop and mobile (especially mobile Safari as a PWA). Do not assume desktop changes will work on mobile without testing.

- **Light/Dark Mode:**
  - Always keep light mode and dark mode color logic separate. Do not mix or override colors/styles between modes; use Tailwind or CSS variables as appropriate to ensure both themes remain visually distinct and accessible.
  - **Dropdowns & Option Styling:**
    - In light mode, dropdown options use filled backgrounds for highlights and selections (e.g., blue for current user, gray for others), with dark text for readability.
    - In dark mode, dropdown options use text-only color highlights (no filled backgrounds), ensuring high contrast and avoiding washed-out or tinted backgrounds. Highlighted options (such as the current user) use a blue text color, not a filled background, and always ensure readable text.
    - Theming logic for dropdowns is handled via a reactive dark-mode detector hook and Tailwind's `dark:` classes. Do not override colors/styles between modes; keep logic explicit and separate.
  - **Mentorship Page Cards:**
    - In dark mode, mentorship cards and info boxes use neutral dark backgrounds (e.g., `bg-gray-800`) with light text (`text-gray-100` or `text-white`). Do not use light blue or green backgrounds in dark mode. Use `!important` overrides if needed to prevent bleed-through from previous styles.
    - In light mode, cards retain their original light blue/green backgrounds and dark text for contrast.
  - **Notification Bell:**
    - The notification bell icon in the header uses a lighter color in dark mode (`dark:text-gray-300`, `dark:hover:text-white`) to match other menu items, with smooth hover and focus transitions. In light mode, it uses the standard gray and hover colors. Do not mix icon color logic between modes.
  - **General Theme-Aware UI:**
    - All theme-aware UI elements (dropdowns, cards, icons, highlights) must use Tailwind's `dark:` classes or a theme detector hook. Never apply a style in one mode that affects the other. Always test for adequate contrast and accessibility in both modes.
  - **Accessibility:**
    - Maintain semantic headings, focus rings, and adequate contrast for all actionable elements. Icons must have text or a title for screen readers.

## Copilot Instructions for Toastmasters Monthly Scheduler
### Project Overview
- **Purpose:** Modern web app for Toastmasters club scheduling, role assignments, and meeting management.
- **Stack:** React 19 (TypeScript, Vite, Tailwind), Firebase (Firestore, Auth, Functions), Node.js.
- **AI Integration:** AI agents (Claude/Gemini) are used for code generation and knowledge management.

### Architecture & Key Patterns
- **Frontend:**
  - Located at project root and `components/`, `services/`, `hooks/`.
  - Uses React functional components and hooks. State is managed via React Context (see `Context/`).
  - Styling is via Tailwind CSS classes.
- **Backend:**
  - All backend logic is in Firebase Functions (`functions/`).
  - Firestore is the only database. **Never introduce a new database.**
  - Email processing is handled via the Firebase 'Trigger Email from Firestore' extension.
- **Knowledge Base:**
  - `graphiti-knowledge-base/` provides persistent memory for AI agents. Scripts here manage project knowledge and technical episodes.

### Golden Rules (Critical Conventions)
- **Single Source of Truth:**
  - Always reference `TM App Golden Rules.md` for database schema, app logic, permissions, and role assignment rules. This file is the master spec for all business logic and data model decisions.
- **Schema Stability:**
  - Never rename or delete existing Firestore collections/fields without a backward-compatible migration plan, staged rollout, and written migration steps.
- **Security & Tenancy:**
  - All reads/writes must be scoped to the user’s club (tenant) using ownerId/clubId. No cross-club reads.
- **Permissions:**
  - Admins can assign any role. Members can only self-assign to unassigned roles they’re qualified for; they can unassign themselves with guardrails.
- **Scheduling Canon:**
  - Use canonical role lists and officer fallback logic. Never reorder or relabel roles without explicit instruction. Role order and names are defined in `Constants.ts` and `types.ts`.
- **UX Parity:**
  - Features must work on mobile Safari (PWA) and desktop equally; verify print/PDF output remains one page for weekly agenda.
- **Timezone & Dates:**
  - Use IANA timezones; treat month indexes as 0-based; meeting dates derive from club meeting day. Use utility functions in `utils/monthUtils.ts` for date math.
- **Sharing:**
  - Public share links are read-only live views; any change in the app reflects instantly on the shared page.
- **Versioning:**
  - Keep the automated date+push counter version display in the footer as shipped. Do not remove or bypass version display logic.

### Developer Workflows
- **Install:** `npm install` (root and `functions/`)
- **Dev Server:** `npm run dev` (root)
- **Deploy Functions:** `cd functions && firebase deploy --only functions`
- **Emulators:** `firebase emulators:start --only functions,firestore`
- **Email Service:** Configure SendGrid via `firebase functions:config:set sendgrid.api_key="..."`
- **Knowledge Base:** See `graphiti-knowledge-base/README.md` for setup and usage.
- **Versioning:** Use `npm run version:update` and `npm run push` to update and push version numbers.

### Component & Service Structure
- Place shared UI in `components/common/`.
- Use `services/` for business logic and external integrations.
- Use `hooks/` for custom React hooks.
- Mentorship logic: `components/mentorship/`, `services/mentorshipService.ts`.
- Weekly agenda logic: `components/WeeklyAgenda.tsx`, `services/weeklyAgendaExport.ts`.

### Integration Points
- **Notifications:** Automated via Firestore triggers and Firebase Functions. Use `notificationService` and keep templates/behavior as shipped.
- **Email:** Outbound via SendGrid or alternative SMTP (see `functions/index.js`).
- **PWA:** App is installable on mobile/desktop. Print styles in `styles/WeeklyAgenda.css`.

### Migration & Guardrails
- **Before changing schema or logic:**
  - Confirm change is tenant-safe, schema-safe, and permission-safe.
  - If schema is touched, write a migration plan: staged rollout, dual-write/read, backfill, cleanup.
  - Never break member self-assign/guardrail rules, blackout semantics, or canonical role order.
  - Do not add new persistent stores or change database vendor.

### Examples
- To add a new meeting role, update both the Firestore schema (per `TM App Golden Rules.md`) and relevant React components/services. Role order and names must match `Constants.ts` and `types.ts`.
- For new business logic, place code in `services/` and reference from components.

### References
- `TM App Golden Rules.md` — always consult for business logic and schema.
- `README.md` — for project setup and high-level architecture.
- `functions/README.md` — for backend/email setup.
- `graphiti-knowledge-base/README.md` — for AI agent memory and knowledge management.
- `.cursor/rules/goldenrules.mdc` — for enforced AI agent rules.

---
**Keep these instructions concise and up to date. Update this file as project conventions evolve.**

## Golden Rules (do not break these)
- Stack is locked: Frontend = React (TypeScript, Vite, Tailwind). Backend = Firebase (Auth, Firestore, Functions). No migrations to other stacks.
- Firestore-first: Persist all app state in Cloud Firestore. Do not introduce a second database.
- Schema stability: Never rename or delete existing collections/fields without a backward-compatible migration plan outlined in writing.
- Security & tenancy: All reads/writes must be scoped to the user’s club (tenant) using ownerId/clubId. No cross-club reads.
- Permissions: Admins can assign any role. Members can only self-assign to unassigned roles they’re qualified for; they can unassign themselves with guardrails.
- Scheduling canon: Use the canonical role lists and officer fallback logic; never reorder or relabel roles without explicit instruction.
- UX parity: Features must work on mobile Safari (PWA) and desktop equally; verify print/PDF output remains one page for weekly agenda.
- Timezone & dates: Use IANA timezones; treat month indexes as 0-based; meeting dates derive from club meeting day.
- Sharing: Public share links are read-only live views; any change in the app reflects instantly on the shared page.
- Versioning: Keep the automated date+push counter version display in the footer as shipped.

## Before you change anything
- Confirm change is tenant-safe, schema-safe, and permission-safe.
- If schema is touched, write a migration plan with: staged rollout, dual-write/read, backfill, cleanup.
- Keep PWA behavior (installable, full-screen) intact.
- Keep printing styles and “Export as PDF/Sheets (TSV)” outputs intact.

## If the user is new
- On first club creation, route to Manage Members (not Schedule).
- Provide tooltips to guide “Add New Member” and “Set Availability”.