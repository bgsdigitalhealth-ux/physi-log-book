<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Shared practical editing uses one PracticalTemplateManager and JournalPreview for faculty and admin; student views consume published templates read-only to keep shared instruction consistent.
- Student choices, unlocking and completion totals use publishedPracticals to include only active catalog records with published templates; staff keep the full catalog for content creation, and clean editor forms follow live template updates without overwriting unsaved work.
- Save journal templates through the security-invoker save_journal_template RPC to atomically synchronize catalog metadata and template content under staff-only RLS; pass previous_code so editing the practical code renames the catalog row, with the sessions/submissions/practical_templates FKs set ON UPDATE CASCADE to follow the rename.
- Student holds go through the set_student_hold SECURITY DEFINER RPC (profiles.is_held/hold_reason); staff-only because students must not lift their own hold.
- The record submission window lives in app_settings key submission_window {start_date,end_date}; windowState in src/lib/submission-window.ts is the single interpreter — unconfigured means drafts and submits are always allowed.
- Sequential practical unlocking is per category, derived from practicals.seq in the student route: the first unapproved practical in each category is open, later ones in that category are locked; no DB flag.
- Profile photos use the private profile-photos bucket (path <user_id>/avatar.*) and render via ProfilePhoto's short-lived signed URLs; never make the bucket public.
- Cross-portal live sync: useRealtimeSync in src/lib/realtime.ts is mounted once in the _authenticated layout and invalidates all React Query caches on postgres_changes for the synced tables; add new shared tables to SYNCED_TABLES and the supabase_realtime publication together.

- Student growth rank/stars come from the security-definer `student_growth_stats()` RPC (students cannot read others`\ submissions, so ranking must be computed server-side).
- Batch management uses one BatchManager (src/components/batch-manager.tsx) for faculty and admin; batches RLS grants writes to faculty and admin only, and new codes come from makeBatchId in src/lib/batch-id.ts so they stay unique.
- Faculty marks edits and review decisions share validateMarks; reset assessment inputs by submission ID so switching students cannot carry another student's marks or remarks.
- Assessment defaults and submission maximum selection use src/lib/assessment.ts; retain the recorded maximum on resubmission so template changes cannot reinterpret existing scores.
- Internal-block record totals and eligibility use the pure internalBlockStats helper so active-record counting and faculty approvals stay consistent and testable; category groupings are currently the default internal blocks.
- Keep sign-in-specific theme overrides scoped to .signin-page so public-page refinements do not change authenticated portal styling.
- Signed-in password changes use auth.updateUser with current_password and password; keep credential fields local, clear them after success, and never persist or log them.
- Admin-created accounts send Cloud Auth recovery emails after role/profile assignment; generated temporary credentials stay server-side, password links land on the public reset-password route, and failed sends permit retry without recreating accounts.
- Shared presentation text uses WebsiteContentProvider and explicit WebText/useWebText bindings; website_content is public-readable and admin-write-only, and editable wording must never replace workflow IDs, option values, personal data or authorization logic. Add new presentation text to website-text-catalog when adding UI.
