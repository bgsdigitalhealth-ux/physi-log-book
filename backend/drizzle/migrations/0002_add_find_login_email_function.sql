create or replace function public.find_login_email(_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where p.email is not null
    and trim(_id) <> ''
    and (
      lower(trim(p.email)) = lower(trim(_id))
      or trim(p.roll_number) = trim(_id)
      or upper(trim(p.register_number)) = upper(trim(_id))
    )
  limit 1;
$$;

comment on function public.find_login_email(text) is 'Resolves a sign-in identifier (email, roll number or university register number) to the account email. Security definer so it can be called before a session exists.';

revoke execute on function public.find_login_email(text) from public;
grant execute on function public.find_login_email(text) to anon, authenticated;