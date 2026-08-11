# Firebase Auth Setup

Use this setup to keep Firestore private while still letting the portal save and load cloud data.

## 1. Enable Email/Password Login

1. Open Firebase Console.
2. Select project `sheshaanglobal-eda84`.
3. Go to Authentication > Sign-in method.
4. Enable Email/Password.

## 2. Create The Portal User

Go to Authentication > Users > Add user.

- Email: `admin@sheshaanglobal.local`
- Password: `Admin@200908`

The app shows only a password field, but it uses this email internally for Firebase login.

## 3. Lock Firestore Rules

Go to Firestore Database > Rules and publish:

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

## 4. Restart The App

After changing `.env.local` or Firebase auth settings, restart the local app and hard refresh the browser with `Ctrl + Shift + R`.
