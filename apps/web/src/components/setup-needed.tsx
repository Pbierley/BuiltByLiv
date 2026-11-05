export function SetupNeeded() {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-4 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Connect Supabase</h1>
      <p className="leading-7 text-muted-foreground">
        Accounts, workout logs, and messages save to Supabase. Add the project
        keys to <span className="text-foreground">apps/web/.env.local</span>,
        then run the SQL migration in{" "}
        <span className="text-foreground">supabase/migrations</span>.
      </p>
      <ul className="grid gap-2 text-sm leading-6">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY</li>
        <li>NEXT_PUBLIC_SITE_URL</li>
      </ul>
      <p className="text-sm leading-6 text-muted-foreground">
        The anon key is safe in the browser. The service role key stays on the
        server and is only used to delete an account and to sign a video link.
        Passwords are hashed by Supabase Auth and are not stored in the app
        database.
      </p>
    </div>
  );
}
