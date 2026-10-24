-- Stage 0: switching logins off and on (spec 4.4). The ban on the Supabase login is added by the server action.

create function public.set_profile_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_user() then
    raise exception 'You need an active login to do this.' using errcode = '42501';
  end if;
  if p_user = auth.uid() and not p_active then
    raise exception 'You can''t switch off your own login.';
  end if;
  update public.profiles set is_active = p_active where id = p_user;
  if not found then
    raise exception 'That user no longer exists.';
  end if;
end;
$$;

revoke execute on function public.set_profile_active(uuid, boolean) from public, anon;
grant execute on function public.set_profile_active(uuid, boolean) to authenticated;
