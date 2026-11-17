# Firestore to Supabase migration

The migration utility reads each supported Firestore collection with a Firebase Authentication account, preserves document IDs, and upserts the records into Supabase in dependency order.

Add these server-only values to `.env.local`. Do not prefix either secret with `NEXT_PUBLIC_` and do not commit the file.

```env
FIREBASE_MIGRATION_EMAIL=an-active-firebase-auth-user@example.com
FIREBASE_MIGRATION_PASSWORD=the-matching-firebase-password
SUPABASE_SERVICE_ROLE_KEY=your-supabase-server-secret
```

First run a read-only inventory:

```powershell
npm run migration:firestore:preview
```

Then, after confirming the collection counts, perform the idempotent upsert:

```powershell
npm run migration:firestore:apply
```

`app_users` is deliberately excluded because profiles must be tied to actual Supabase Auth users. The existing leadership bootstrap migration remains the safe way to manage those accounts.
