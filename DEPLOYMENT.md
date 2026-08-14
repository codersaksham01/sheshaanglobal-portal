# Sheshaan Global Smart Portal Deployment

## Supabase

1. Create a new Supabase project and run `schema.sql` in the SQL editor.
2. Create the first administrator in Authentication > Users.
3. Run the bootstrap `app_users` query at the bottom of `schema.sql` with that administrator's email.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deployment environment.

The browser uses only the Supabase anonymous key. Never expose the service-role key. Row Level Security independently enforces portal roles for every write.

## Netlify

Connect the GitHub repository to Netlify. The included `netlify.toml` uses the supported Next.js build and Node 22. Add both Supabase public environment variables before the first production build. The local `db.json` adapter is for development only and is not persistent on serverless hosting.

## Docker

Build with the public Supabase configuration embedded into the client bundle:

```sh
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY \
  -t sheshaan-global-portal .
docker run --rm -p 3000:3000 sheshaan-global-portal
```

The container exposes `/api/health` for platform health checks and runs as an unprivileged user.
