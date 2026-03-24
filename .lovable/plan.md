

## Plan: Admin Dashboard, Contact Form, and Site Analytics

### Overview
Build a self-contained analytics and lead management system directly into the site. Three major pieces: (1) track all visitor interactions, (2) save contact form submissions, (3) password-protected admin dashboard to view everything.

---

### Database Changes (3 new tables)

**`site_events`** — tracks page views, button clicks, LinkedIn clicks, etc.
- `id`, `event_type` (page_view, click, linkedin_click, etc.), `event_data` (JSONB — page path, button label, referrer, etc.), `session_id` (anonymous UUID stored in localStorage), `ip_address` (text, nullable), `user_agent`, `created_at`
- RLS: public INSERT (anyone can log events), SELECT restricted to admin

**`contact_submissions`** — stores form fills from the homepage
- `id`, `name`, `email`, `phone` (nullable), `company` (nullable), `message`, `service_interest` (nullable), `is_read` (boolean, default false), `created_at`
- RLS: public INSERT, SELECT restricted to admin

**`admin_users`** — simple admin access table
- `id`, `user_id` (references auth.users), `created_at`
- RLS: SELECT only for the user's own row

A `is_admin` security definer function will check if a user_id exists in `admin_users`.

---

### New Components & Pages

**1. Homepage Contact Form (`src/components/ContactForm.tsx`)**
- Fields: Name, Email, Phone (optional), Company (optional), Message, Service Interest (dropdown matching your 5 tiers)
- On submit: inserts into `contact_submissions` + shows success toast
- Placed on the homepage between ServicesPricing and Testimonials

**2. Event Tracking Hook (`src/hooks/useTrackEvent.ts`)**
- Generates/stores a `session_id` in localStorage
- Exposes `trackEvent(type, data)` function that inserts into `site_events`
- Auto-tracks page views on route change (wrap in App.tsx)
- Specific click tracking added to: LinkedIn links (Footer, ContactModal, FloatingContact, Hero), CTA buttons, nav links

**3. Admin Login Page (`src/pages/AdminLogin.tsx`)**
- Simple email/password login using Supabase Auth
- After login, checks `admin_users` table — if not admin, shows "Access Denied"
- Route: `/admin/login`

**4. Admin Dashboard (`src/pages/AdminDashboard.tsx`)**
- Protected route — redirects to login if not authenticated admin
- Route: `/admin`
- Sections:
  - **Overview cards**: Total visitors (unique sessions), total page views, total form submissions, LinkedIn clicks
  - **Contact Submissions table**: Name, email, phone, company, message, service interest, date — with mark-as-read toggle
  - **Event Log**: Filterable table of recent events (page views, clicks) with timestamps
  - **LinkedIn Click count** prominently displayed
- Real-time refresh button + auto-refresh option

**5. Admin Nav Entry**
- Small "Admin" link in the footer (subtle, not prominent) — links to `/admin/login`
- No visible admin indicator in main nav

---

### Auth Setup
- Enable email/password auth (no auto-confirm — you'll verify your email once)
- After first deploy, you manually sign up once, then I insert your user_id into `admin_users` via the database
- Or: use a known email check in the security definer function for initial bootstrap

---

### Click Tracking Implementation
All LinkedIn links across the site get an `onClick` handler that calls `trackEvent('linkedin_click', { location: 'footer' })` (or hero, modal, floating, etc.). Same pattern for CTA buttons, nav links, and any other trackable interaction.

---

### File Summary

| Action | File |
|--------|------|
| Create | `src/components/ContactForm.tsx` |
| Create | `src/hooks/useTrackEvent.ts` |
| Create | `src/pages/AdminLogin.tsx` |
| Create | `src/pages/AdminDashboard.tsx` |
| Modify | `src/pages/Home.tsx` — add ContactForm |
| Modify | `src/App.tsx` — add admin routes + page view tracking |
| Modify | `src/components/Footer.tsx` — add admin link + LinkedIn tracking |
| Modify | `src/components/Hero.tsx` — add click tracking |
| Modify | `src/components/ContactModal.tsx` — add click tracking |
| Modify | `src/components/FloatingContact.tsx` — add click tracking |
| Modify | `src/components/Navbar.tsx` — add click tracking |
| Migration | Create `site_events`, `contact_submissions`, `admin_users` tables + RLS + `is_admin` function |

