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
- Save journal templates through the security-invoker save_journal_template RPC to atomically synchronize catalog metadata and template content under staff-only RLS.
- Student holds go through the set_student_hold SECURITY DEFINER RPC (profiles.is_held/hold_reason); staff-only because students must not lift their own hold.
- The record submission window lives in app_settings key submission_window {start_date,end_date}; windowState in src/lib/submission-window.ts is the single interpreter — unconfigured means drafts and submits are always allowed.
- Sequential practical unlocking is per category, derived from practicals.seq in the student route: the first unapproved practical in each category is open, later ones in that category are locked; no DB flag.
- Profile photos use the private profile-photos bucket (path <user_id>/avatar.*) and render via ProfilePhoto's short-lived signed URLs; never make the bucket public.
- Cross-portal live sync: useRealtimeSync in src/lib/realtime.ts is mounted once in the _authenticated layout and invalidates all React Query caches on postgres_changes for the synced tables; add new shared tables to SYNCED_TABLES and the supabase_realtime publication together.

- Student growth rank/stars come from the security-definer `student_growth_stats()` RPC (students cannot read others`\ submissions, so ranking must be computed server-side).
- Batch management uses one BatchManager (src/components/batch-manager.tsx) for faculty and admin; batches RLS grants writes to faculty and admin only, and new codes come from makeBatchId in src/lib/batch-id.ts so they stay unique.
- Faculty marks edits and review decisions share validateMarks; reset assessment inputs by submission ID so switching students cannot carry another student's marks or remarks.
- Internal-block record totals and eligibility use the pure internalBlockStats helper so active-record counting and faculty approvals stay consistent and testable; category groupings are currently the default internal blocks.
