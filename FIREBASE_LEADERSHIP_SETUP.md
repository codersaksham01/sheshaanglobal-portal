# Firebase leadership accounts and Firestore profiles

The portal is configured for Firebase Authentication and Cloud Firestore. Do not use Supabase migration or service-role instructions for this deployment.

## 1. Enable sign-in

In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**.

## 2. Create the four Authentication users

In **Authentication → Users → Add user**, create the four leadership email accounts with the chosen initial password. Firebase will create a UID for each account; copy it for the next step. Do not store the password in source code.

## 3. Create portal-directory documents

In **Firestore Database → Data**, create collection `app_users`. Create one document per Firebase user, preferably using that user's Firebase UID as the document ID. Use these required fields:

```text
id: <Firebase UID>
auth_user_id: <Firebase UID>
name: <person's full name>
email: <account email, lowercase>
title: <designation>
role: Executive or Admin
active: true
status: Approved
requested_role: Executive or Admin
phone: ""
avatar_url: ""
address_line1: ""
city: ""
state: ""
country: ""
postal_code: ""
bio: ""
timezone: Asia/Kolkata
created_at: <ISO timestamp>
updated_at: <ISO timestamp>
```

Set the three leadership users to `Executive`. Set the `info` account to `Admin`.

## 4. Firestore rules

The current portal adapter requires signed-in users to access its business collections. In **Firestore Database → Rules**, retain the authenticated-user baseline from `FIREBASE_AUTH_SETUP.md` while the system is operated by the internal team:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For production hardening, replace this broad rule with a Firebase Admin SDK / Cloud Functions layer and role-aware Firestore rules. Direct messages should not be presented as private until that server-side enforcement is in place.

## 5. Validate

Restart the app, sign in with each account, confirm that the matching `app_users` document is active, then check `/profile`, `/team-chat`, and `/users` (admin only).
