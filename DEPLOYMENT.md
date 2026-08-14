# Sheshaan Global Smart Portal Deployment

## Supabase

1. Create a new Supabase project and run `schema.sql` in the SQL editor.
2. Create the first administrator in Authentication > Users.
3. Run the bootstrap `app_users` query at the bottom of `schema.sql` with that administrator's email.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deployment environment.

The browser uses only the Supabase anonymous key. Never expose the service-role key. Row Level Security independently enforces portal roles for every write.

## Netlify

Connect the GitHub repository to Netlify. The included `netlify.toml` uses the supported Next.js build and Node 22. Add both Supabase public environment variables before the first production build. The local `db.json` adapter is for development only and is not persistent on serverless hosting.

## Runtime Architecture

This portal is deployed as a standard Next.js App Router application on Netlify. It does not require containers, container registries, or paid AI API keys. Automation is handled through deterministic TypeScript workflows in the app and Supabase PostgreSQL functions, triggers, Row Level Security, Auth, and Storage.

Use `/api/health` for Netlify or uptime health checks.
