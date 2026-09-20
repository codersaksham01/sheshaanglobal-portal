# Sheshaan Global iOS IPA Build

This project is wrapped as an iOS app with Capacitor.

## What is already prepared

- Capacitor config: `capacitor.config.ts`
- iOS native project: `ios/App/App.xcodeproj`
- Default app id: `com.sheshaanglobal.portal`
- Default app name: `Sheshaan Global`
- Default portal URL: `https://sheshaanglobal.com`

The iOS app loads the deployed portal URL inside a native iOS shell. This keeps API routes, database access, PDFs, and login behavior working like the web portal.

## Change the portal URL

If the portal is deployed somewhere else, run sync with:

```bash
CAPACITOR_SERVER_URL="https://your-portal-url.com" npm run ios:sync
```

On Windows PowerShell:

```powershell
$env:CAPACITOR_SERVER_URL="https://your-portal-url.com"; npm run ios:sync
```

## Build the `.ipa`

The final signed `.ipa` requires macOS with Xcode and an Apple Developer account.

1. Copy/pull this repo on a Mac.
2. Run:

```bash
npm install
npm run ios:sync
npm run ios:open
```

3. In Xcode:
   - Select the `App` target.
   - Set your Apple Team under `Signing & Capabilities`.
   - Confirm bundle identifier, for example `com.sheshaanglobal.portal`.
   - Choose `Any iOS Device`.
   - Use `Product > Archive`.
   - In Organizer, choose `Distribute App`.
   - Export an `.ipa` for TestFlight, App Store, Ad Hoc, or Enterprise distribution.

## Notes

- Windows can generate the iOS project, but cannot create a signed `.ipa`.
- The portal must be deployed with HTTPS for iOS production use.
- If you want the app to work offline, the Next.js app would need a separate static/offline build and backend features would need API replacements.
