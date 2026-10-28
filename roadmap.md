# Roadmap
- [x] Remove the "Who it's for" and "Practical Curriculum" homepage sections shown in the latest image; confirmed absent in the preview.
- [x] Update the homepage with a medical image-led banner inspired by the reference; desktop and phone layouts checked.

- [x] Add admin-only Edit web with shared presentation-text editing, reset controls, secure persistence and live updates; saved text verified in student view and live on public homepage, with test edits restored.

- [ ] Use info@acudigiverse.com for account emails and notification emails with the domain managed at GoDaddy — blocked until a workspace admin or owner configures the sending domain.

- [x] Add faculty Settings password replacement with current-password entry, confirmation and cleared fields; five validation tests pass.
- [ ] Verify faculty password save and new-password sign-in — blocked by the managed preview session redirecting to Admin and expiring during sign-out testing.

- [x] Add automatic server-side temporary credentials, Create Account & Send Email, Send Password Link retry, and a public password-setting page; admin creation/readback and invalid-link rejection verified, eight password tests pass.
- [ ] Verify password email delivery and valid-link password setting — Cloud Auth rejected the email send during the signed-in creation test; no delivery or usable email link could be verified. Custom sender still requires workspace setup.

- [x] Limit student practical choices and completion totals to active published faculty/admin records; verified two-option dropdown and live template-title update without student reload, with original title restored

- [x] Match the uploaded PDF’s single-total faculty assessment and use 5 marks for new templates without changing existing scores; 18 tests pass and new-template maximum verified in Admin
- [ ] Verify faculty score saving and student/admin readback after this update — blocked because the preview session redirects faculty navigation back to Admin

- [x] Match the PDF faculty assessment flow and verify saved marks in student and admin views

- [x] Match the PDF practical template manager for faculty and admin with complete content editing, tables, questions, preview and publishing
- [x] Enforce faculty/admin-only shared template editing and verify student read-only access

- [x] Bring the Physiology log-book app into Lovable (login, student, faculty, admin)
- [x] Create the backend tables, permissions and practical templates
- [x] Sign up a test student and confirm the student dashboard opens
- [x] Confirm the faculty and admin consoles open and all their views render
- [x] Show the user the preview and the first things to click
- [x] Let the admin enrol students with a temporary password (so logins work without email confirmation)
- [x] Enrol a demo student and confirm signing in opens the student dashboard
- [x] Analyse all uploaded source files (login, student, faculty, admin HTML/JS/CSS) against the built screens and close every gap
- [x] Sign in with roll number or register number, like the source pages allow
- [x] Remove "Continue with Google" / "Continue with Lovable" and the "or" divider from the sign-in page
- [x] Students can attach images/PDFs to a practical entry; faculty can open them in the review screen
- [x] Make student Progress & Analytics reflect real marks/attendance (verify end-to-end with faculty marks)
- [x] Remove "High-Yield Practical Viva Bank" section from student page
- [x] Rename student nav "Feedback / Viva Prep" to "Upgrade" and replace "Cumulative Faculty Remarks" with "Your Growth" (rank + stars)
- [x] Remove the photo upload helper text from the student profile
- [x] Faculty and admin: create, edit, update and delete batches (shared batch manager + faculty write access)
- [x] Rename the student entry heading to "Practical Record Lab"
