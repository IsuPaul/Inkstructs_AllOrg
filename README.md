# Inkstructs — Phase 1 + Phase 2

Instructor-led training dashboard: admin, instructor and student portals on
Next.js 15 + Supabase.

## What's included

**Phase 1 — foundation**
- Full database schema with Row Level Security for three roles (`supabase/migrations`)
- A rollup trigger that marks a module **COMPLETE** once every required lesson is done
- Invite-only auth (no public sign-up) with role-based route protection
- Three dashboard shells: `/admin`, `/teach` (instructor), `/dashboard` (student)
- Public pages: landing page, `/apply` (application form), `/login`
- Working loop: apply → admin accepts & invites → student sets password →
  sees their course → opens a module → marks a lesson complete → module and
  week update automatically

**Phase 2 — course builder & content**
- A real course builder at `/admin/courses/[id]/builder` (and the instructor
  equivalent at `/teach/courses`): add, edit and delete modules and lessons
  inside each week
- **Video upload direct to Mux**, with a progress bar and processing status,
  played back through a signed token so only enrolled, signed-in students
  can watch
- **Document and image upload** to a private Supabase Storage bucket, served
  to students through short-lived signed URLs
- **Assignment submissions**: students attach text and/or a file; instructors
  grade from `/teach/submissions`
- **Instructor invites** from `/admin/instructors`
- **Announcements** posted from an instructor's cohort page, with a red-dot
  unread indicator in the student's sidebar
- **Free cohorts** (price ₦0) activate a student immediately on acceptance,
  no payment step required
- **Direct student invites** from a cohort page, skipping `/apply`, with a
  choice of free or paid enrollment
- **Quizzes can allow or block retakes**, instructor's choice per quiz
- **Assignments** support a submitted link in addition to text/file, are
  limited to one submission, and instructors can attach a reference
  document

## 1. Set up Supabase

1. In your Supabase project, open the **SQL Editor**.
2. Run all eleven files in `supabase/migrations` **in order**:
   `0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql`,
   `0004_profile_fields.sql`, `0005_quizzes.sql`,
   `0006_course_materials_storage.sql`, `0007_submissions_storage.sql`,
   `0008_updates.sql`, `0009_updates.sql`, `0010_updates.sql`,
   `0011_cohort_courses.sql`.
   **`0011` restructures existing cohort/course/enrollment data — back up
   first if you have real students in the database.**
   Every migration is safe to re-run — if a file partially ran before and
   you're not sure where it stopped, just run the whole file again.
3. Go to **Authentication → URL Configuration** and set the Site URL to your
   deployed URL (or `http://localhost:3000` for now), and add
   `http://localhost:3000/auth/accept-invite` (and your production
   equivalent) under **Redirect URLs**. Without this, invite links won't be
   allowed to land on that page.
4. No email template changes are required — the default "Invite user"
   template works as-is (see note below if you ever hit trouble with it).

### A note on the invite link

Supabase's invite email links to Supabase's own servers, which verify the
link and redirect to your app with the session tucked into the URL. The
"set password" step in this app runs entirely in the browser, using that
same session directly — so it doesn't depend on the server separately
seeing a cookie, and there is no dashboard configuration required.

If you have custom SMTP set up and want to route invite links through your
own domain first (optional, not required), a server-side verification route
is included at `/auth/confirm`. To use it, edit **Authentication → Email
Templates → Invite user** in Supabase, find the confirmation link, and
replace `{{ .ConfirmationURL }}` with:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/accept-invite
```

This is purely optional — the app works correctly without it.

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
  Supabase → Project Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` — same page, the **service_role** secret.
  Never expose this to the browser or commit it.
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally, your Vercel URL
  in production.

Leave the Paystack and Resend keys blank for now — they're used from Phase 3
onward. Fill in the Mux keys using the steps below.

## 3. Set up Mux (video)

1. Create a free account at [mux.com](https://mux.com) if you don't have one.
2. **API access token** — Settings → API Access Tokens → **Generate new
   token**. Give it permission for "Mux Video" (read and write). Copy the
   **Token ID** and **Token Secret** into `.env.local` as `MUX_TOKEN_ID` and
   `MUX_TOKEN_SECRET`.
3. **Webhook** — Settings → Webhooks → **Create new webhook**.
   - URL: `https://YOUR-DOMAIN/api/webhooks/mux` (for local testing, see the
     note below — Mux can't reach `localhost` directly).
   - Copy the **Signing secret** into `.env.local` as `MUX_WEBHOOK_SECRET`.
   - This webhook is what marks an uploaded video "ready" once Mux finishes
     processing it — without it, uploaded videos will sit at "Preparing"
     forever.
4. **Signing key (recommended, not required)** — Settings → Signing Keys →
   **Generate new signing key**. Copy the **Key ID** into `.env.local` as
   `MUX_SIGNING_KEY_ID`. Download the private key file, then base64-encode
   it and paste the result as `MUX_SIGNING_KEY_PRIVATE_KEY`:
   ```bash
   # macOS/Linux
   base64 -i your-key.pem | tr -d '\n'
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("your-key.pem"))
   ```
   Without this, uploaded video still works, just with a public (unsigned)
   playback URL — anyone with the link could watch it, not just enrolled
   students. Add this before going live with real students.

**Testing webhooks on localhost:** Mux needs a public URL to send the
webhook to. Use the [Mux CLI](https://github.com/muxinc/mux-cli) or a tunnel
tool like `ngrok http 3000`, then set the webhook URL to the tunnel's
address plus `/api/webhooks/mux`. Once deployed to Vercel, switch it to your
real domain.

## 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 5. Create your admin account

```bash
npx tsx scripts/seed-admin.ts you@example.com "Paul Inya Isu"
```

This sends an invite email to that address with the `admin` role already
attached. Open the email, set a password, and you'll land on `/admin`.

## 6. Try the full loop

1. Go to `/admin/courses` and create a course (e.g. "Python Programming",
   8 weeks, 3 days a week).
2. Click **Manage content** on that course. Add a module to Week 1, then
   add a few lessons to it — try one of each type:
   - **Video**: add the lesson, then click **Upload video** and pick a short
     file. You'll see an upload progress bar, then "Processing video…"
     until Mux's webhook marks it ready (usually seconds to a couple of
     minutes).
   - **Document** or **Image**: click **Upload file** and pick one.
   - **Assignment**: add instructions in the text box.
3. Go to `/admin/cohorts` and create a cohort for that course with a start
   date and price.
4. Open the cohort and assign yourself or an invited instructor to it.
5. Go to `/apply` (in a private window, or sign out first) and submit an
   application for that course.
6. Back in `/admin/applications`, accept it into the cohort you created —
   this sends the student an invite email.
7. Open the invite, set a password, and you'll land on `/dashboard` with
   that course visible.
8. Open the course, then the module you built. You should see the video
   play, the file be downloadable, and — for the assignment — a form to
   submit text and a file.
9. As the instructor, go to `/teach/submissions` to grade what the student
   submitted. As the student, revisit `/assignments` to see the grade.
10. Try `/admin/instructors` to invite a second account, and the cohort
    page's announcement form to post something a student will see on their
    dashboard.

## 7. Deploy

1. Push this repo to GitHub.
2. Import it in Vercel, add the same environment variables there
   (Project Settings → Environment Variables).
3. Update `NEXT_PUBLIC_SITE_URL` to the Vercel domain, and update Supabase's
   Site URL / Redirect URLs to match.

## Latest round — courses as a subset of cohorts, editable course length

One new migration: `0011_cohort_courses.sql`. **This one restructures real
data** (it moves existing cohorts' course/price/capacity into a new table),
so back up your database before running it if you have real students in it.
It's written to be safe to re-run if interrupted partway through.

- **A cohort can now offer several courses at once.** Before, a cohort was
  tied to exactly one course. Now a cohort (an intake/batch — e.g. "Nov 2026
  Intake") is just a name and a start date, and you add one or more courses
  to it from its page, each with its **own price, capacity, and
  instructors**. A student still enrolls in one specific course within a
  cohort — they only ever see that course, never the others running under
  the same cohort, even though they're nominally "in" it.
- **Admin can now change a course's length** — grow it freely (new empty
  weeks just get appended), or shrink it, from the course builder page. The
  one thing that's blocked: removing a week that already has modules in it,
  since that would quietly delete real content. Delete that content from
  the builder first if you genuinely want to shrink the course.

### What changed under the hood, if you're curious
`cohorts` lost `course_id`, `price_kobo`, and `capacity`. A new
`cohort_courses` table holds those now, one row per "this course, in this
cohort, at this price." Everything that used to point at a cohort directly
— enrollments, instructor assignments, live sessions, announcements,
certificates — now points at a `cohort_course` instead. Existing data is
carried over automatically in the migration (every old cohort had exactly
one course, so the mapping is unambiguous).

### What this means for pages you're used to
- `/admin/cohorts/[id]` now shows a list of courses offered under that
  cohort, each with its own price/capacity editor, instructor list, invite
  form, and student list — rather than one course's worth of those things.
- `/admin/applications`: accepting a student now has you pick which
  specific course-offering (cohort + course) to put them in, scoped to the
  course they actually applied for.
- `/teach` lists the specific courses-within-cohorts an instructor teaches;
  `/teach/cohorts/[id]` is really "my view of one course within one
  cohort" now.

## Earlier round — progress formula, scheduled modules, grading formats

One new migration: `0010_updates.sql`.

- **Course progress is now a function of lessons and weeks**, exactly as
  specified:
  `(completed lessons × weeks with content) / (total lessons × course's full duration) × 100`.
  The "weeks with content" term is what stops an unbuilt course from
  reading as further along than it is — finishing the one week that
  exists doesn't show as mostly done when six more weeks haven't been
  built yet. When every week has content, that term cancels out to a
  plain lesson-completion percentage. This lives in a single SQL view
  (`course_progress`) so the dashboard and the course page can never
  disagree with each other about the number.
- **Instructors can schedule when a module unlocks** — immediately (the
  default), or at a specific date and time, set per module in the course
  builder. Before that time, students see the module in their roadmap as
  locked with an "unlocks on…" date, and can't open its lessons, video, or
  files even by guessing the URL — enforced at the database level, not
  just hidden in the UI.
- **Grading format is the instructor's choice, per assignment.** When
  creating or editing an assignment in the course builder, pick **Fraction**
  (shown as `8/10`, you set the "out of" number) or **Whole number**, and
  for whole numbers, **Percentage** (`85%`) or **Unitless** (`85`). The
  grading input instructors see, and the grade students see, both follow
  whatever was configured — existing ungraded assignments just behave as
  plain numbers until a scheme is set.

## Earlier round — a different design direction

The earlier design pass used a serif display typeface (Fraunces) for every
heading across the entire app, which read as editorial/blog rather than
enterprise software — that was the likely core issue. This round is a more
decisive shift:

- **Serif dropped entirely.** The whole app — every heading, every page —
  now uses one confident, bold sans-serif (Hanken Grotesk) with tight
  tracking, the same direction as Linear, Stripe's dashboard, or Mercury.
  The font package for Fraunces was removed outright.
- **A real chart on the admin overview** — a new-enrollments trend over the
  last 10 weeks, using Recharts, instead of only static numbers. It reads
  as an actual analytics dashboard rather than a handful of stat tiles.
- **Payments, students, and certificates are now real data tables** (proper
  `<table>` with a header row, right-aligned numbers, hover states) instead
  of stacked card rows — the right pattern for dense, scannable admin data.
- **More depth throughout**: a subtle background gradient instead of flat
  white/paper, a richer sidebar with its own gradient and glow on the
  active item, consistent empty states everywhere.

No functionality changed — this is styling and font-loading only.

## Earlier round — account deactivation, a real progress bug, inline PDFs, resume

One new migration this round: `0009_updates.sql`.

- **Admins can deactivate instructors and students** from `/admin/students`
  and `/admin/instructors` — a "Deactivate" button on each row. A
  deactivated account is signed out immediately and can't sign back in
  until reactivated; nothing is deleted, so it's fully reversible.
- **Fixed: the course progress bar showing 100% after one week.** The real
  bug — a week with no modules yet (the instructor hasn't built it out)
  was counted as "complete," because checking "did the student finish every
  required module in this week" on an *empty list* of modules is
  vacuously true in JavaScript. A course with 7 unbuilt weeks and 1 finished
  week was reporting as nearly done. Fixed by explicitly requiring a week to
  have at least one module before it can count as complete.
- **PDFs now display inline** on the lesson page — no more forcing a
  download for something a student just wants to read. Word and PowerPoint
  files don't have a reliable, private way to embed directly in the browser
  (the only real options route the file through a third-party viewer like
  Microsoft's or Google's, which means briefly exposing a private file to
  an outside service) — those still open as a direct link. If this matters,
  the practical workaround is uploading a PDF export instead, which most
  instructors already have from Word/PowerPoint's own "Export as PDF."
- **"Continue where you left off."** Opening a course from the dashboard
  now takes a student straight back into whatever module they last had
  open, instead of always landing on the week roadmap. The roadmap page
  itself also shows a "Continue" card at the top linking to that same spot,
  for anyone who reaches it a different way (a bookmark, a shared link).

## Earlier round — visual design pass

No functionality changed in this round — every edit was CSS/layout only, and
the full project still builds and type-checks cleanly.

- **Refined design tokens**: deeper ink shades, ink-tinted shadows instead of
  generic black ones, a slightly richer amber, tabular numerals on all
  progress/KPI numbers.
- **Dark sidebar** across all three portals, with a logo mark, a left accent
  bar for the active page, and a cleaner user footer.
- **A proper landing page and auth pages** — a dark hero section on `/`, and
  a shared split-screen layout (branded panel + form) for login, apply,
  forgot-password, accept-invite, and reset-password.
- **Admin overview** now has real stat cards with icons and a live "recent
  applications" feed, instead of a plain number grid.
- **Course cards, the week ledger, and the course detail page** got a pass:
  bigger progress numbers, icon-driven module status, a highlighted quiz row.
- **The course builder** has clearer visual hierarchy between weeks, modules
  and lessons, with hover-revealed edit/delete actions instead of
  always-visible icon clutter.
- **The quiz-taking screen** now uses card-style selectable options and a
  proper score badge instead of plain radio buttons.
- A reusable `EmptyState` component replaced one-off "nothing here" messages
  across the app, and every list page got a consistent hover state on rows.

## Earlier round — free cohorts, direct invites, assignments, quiz retakes

- **Free cohorts.** Set a cohort's price to ₦0 when creating it. Accepting an
  application into a free cohort now activates the student immediately —
  no payment step blocks them, since Phase 3's Paystack flow doesn't exist
  yet and shouldn't need to for cohorts that were never going to charge.
- **Invite a student directly**, bypassing `/apply` entirely — from a
  cohort's page (`/admin/cohorts/[id]`), enter their name and email and
  choose **free access** or **pending payment**. Useful for referrals,
  scholarships, or manual sales.
- **Fixed: instructors couldn't see submitted assignments.** The real bug:
  `submissions` has two foreign keys to `profiles` (the student, and
  whoever graded it), so the query's `profiles(full_name)` was ambiguous —
  Postgres couldn't tell which relationship to use, the whole query quietly
  failed, and the page showed "nothing submitted." Fixed by qualifying it
  as `profiles!student_id(full_name)`. (The same bug existed on the
  certificates page and is fixed there too, before it caused the same
  confusion.)
- **Instructors can attach a reference file to an assignment** (a prompt
  document, a rubric, a worksheet) from the course builder — the same
  upload button used for documents and images now also appears on
  assignment-type lessons.
- **Students can submit a link**, not just text and a file — useful for
  Google Drive, GitHub, or anywhere else their work lives.
- **Assignments are one trial only.** Once a student submits, the form is
  replaced with a summary and can't be resubmitted — enforced both in the
  UI and with a database constraint, so it can't be bypassed by retrying a
  failed request.
- **Quiz retakes are now an instructor choice.** A checkbox in the quiz
  builder — "Allow students to retake this quiz" — controls whether the
  "Retake quiz" button appears after a student sees their score. Off means
  one attempt only, enforced in the database, not just hidden in the UI.
- **Weeks in the course builder are now collapsible** — click a week's
  header to fold it away, useful once a course has several weeks of
  content.
- **Unread announcements show a red dot** next to "Announcements" in a
  student's sidebar. Visiting the page marks everything currently listed as
  read.
- Reverting a lesson from complete back to incomplete was already possible
  (click the "Marked complete" button again) — included here in case it
  wasn't obvious from the UI.

## Earlier fixes

No new SQL migrations in this section — every fix below was app code only.

- **Courses can now actually be published.** `/admin/courses` had a status
  badge but no way to change it — that button never existed. Each course
  row now has a working **Publish / Unpublish** button.
- **Cohorts can be opened.** `/admin/cohorts` listed cohorts but nothing was
  clickable — there was no detail page at all. Each cohort now links to
  `/admin/cohorts/[id]`, where you can change its status (draft → open →
  running → completed), assign or remove instructors, and see who's
  enrolled.
- **Invite links made more reliable.** The session-detection logic now
  explicitly handles every shape Supabase's email links can take (hash
  tokens, PKCE `?code=`, or an error Supabase embeds in the link itself),
  instead of relying on the client library to guess. If a link genuinely is
  expired or was already used, the page now shows Supabase's actual reason
  instead of a generic message — useful if this needs debugging further.
- **Password reset actually exists now.** There was no "forgot password"
  feature at all before, which is why it dropped you back on the landing
  page — nothing was built to catch that link. `/login` now has a "Forgot
  password?" link, going to `/forgot-password` → email sent →
  `/auth/reset-password` to set a new one.
- **Noticeably faster navigation.** Every page load was doing up to 4
  sequential auth checks before it even started fetching its own data: the
  middleware checked the session and role, then every single page's layout
  independently re-checked the session and re-fetched the profile — 2 extra
  full network round trips to Supabase, every click. The middleware now
  does that check once and safely forwards the result to the page. A couple
  of pages that were fetching independent data one-after-another (dashboard,
  course page) now fetch it in parallel instead. Pages also show a loading
  skeleton immediately on click rather than a frozen screen.

  One thing I can't fix from here: if your Supabase project's region is far
  from Nigeria (e.g. US East), every one of those round trips carries extra
  network latency no amount of code can remove. Worth checking **Project
  Settings → General → Region** — if it's not already in a region close to
  West Africa, migrating closer (or at minimum, to Europe) will noticeably
  help.

## What's new since the first drop

- **Fixed the invite flow.** `/auth/accept-invite` was being blocked by the
  auth middleware before the invite link could ever be processed, which is
  why the admin was asked for a password that didn't exist. It's now public,
  and the page properly exchanges the invite link's token for a session
  before letting the person set their password.
- **Every role can edit their own profile** — name, photo, date of birth,
  state of origin — at `/profile` (shared by all three portals, in the
  sidebar for each). Photos upload to a private-by-default `avatars` bucket
  scoped so a user can only write inside their own folder.
- **Instructors can build a multiple-choice quiz for any week.** From
  `/teach/quizzes`, pick a week and add questions with up to however many
  options you like, marking the correct one. Students see a "Take quiz" row
  under that week on their course page, answer it, and get an instant score.
  Correct answers are never sent to the student's browser before they
  submit — grading happens inside a Postgres function
  (`submit_quiz_attempt`), not in the app code.

## What's next (Phase 3)

- Paystack checkout and payment webhook (students currently get invited on
  acceptance; payment before access isn't wired up yet)
- Certificate generation on course completion
- Reorder modules/lessons by dragging instead of setting numbers manually
- Live class reminders and a richer announcements inbox

## Project structure

```
supabase/migrations/     Schema, RLS policies, functions/triggers, storage buckets — run in order
scripts/seed-admin.ts    Creates the first admin account
src/lib/supabase/        client.ts (browser), server.ts (Server Components), admin.ts (service role)
src/lib/auth.ts          requireProfile() (fast, header-based) / requireFullProfile() (profile page)
src/lib/mux.ts           Mux direct-upload creation + signed playback tokens
src/middleware.ts        Session refresh, role-gated routes, forwards profile via headers
src/actions/             Server Actions: auth, applications, progress, course-builder, media,
                         submissions, announcements, admin content, admin instructors
src/app/(student)/       Student portal
src/app/(instructor)/    Instructor portal
src/app/(admin)/         Admin portal
src/app/api/webhooks/mux/  Marks an uploaded video "ready" once Mux finishes processing it
src/components/shell/    Sidebar, mobile nav, dashboard shell, top bar
src/components/course/   Course card, week ledger (progress bar), lesson toggle, Mux player,
                         assignment submission widget
src/components/builder/  The course builder (weeks → modules → lessons), video/file uploaders
```
