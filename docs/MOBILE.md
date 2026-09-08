# Web থেকে Android APK

JPMS uses Capacitor to package the existing React web UI. This preserves forms, routes and business logic. A React Native version would reuse concepts and some services, but would need new native UI components.

Included: Capacitor 8 dependencies/config, cold/warm native auth link handling, and Android-friendly text-file exports through Filesystem/Share. **No Android project, compiled APK, release signing key or completed device test is included.** These require your Android toolchain.

## 1. প্রস্তুতি

আগে README অনুযায়ী Supabase-backed web version চালু করুন। Then install Android Studio and the Android SDK required by the generated Capacitor project. Capacitor 8 requires Node 22+ and Android Studio 2025.2.1 or later; this Vite project uses Node 22.12+ and was tested with Node 24. Use Android Studio's provided JDK unless your toolchain requires otherwise. [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)

`capacitor.config.json` already contains:

```json
{
  "appId": "com.jakaria.jpms",
  "appName": "JPMS",
  "webDir": "dist",
  "server": { "androidScheme": "https" }
}
```

The app bundles `dist`; it does not depend on a development server URL. Your Supabase URL/key are still required at build time. For web fallback links, use your HTTPS web domain as `VITE_APP_URL`.

## 2. Native project তৈরি

Project root-এ:

```bash
npm ci
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

`android:add` শুধু প্রথমবার চালান। `android/` already থাকলে `android:sync` ব্যবহার করুন। JavaScript, dependencies বা environment variables change করলে আবার sync করুন—এটি build-ও চালায়। Generated native files আপনার repository-তে commit করে ভবিষ্যতের native changes track করতে পারেন।

## 3. Email confirmation ও password recovery deep links

Native runtime-এ `AuthPage.jsx` email redirect হিসেবে ব্যবহার করে:

```text
com.jakaria.jpms://auth/callback
com.jakaria.jpms://auth/recovery
```

দুটিই Supabase **Authentication → URL Configuration → Redirect URLs**-এ add করুন। Web URLs-ও রাখুন। Supabase email confirmation/recovery redirect native app-এ ফিরিয়ে আনার জন্য custom scheme configuration প্রয়োজন। [Supabase mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

`android/app/src/main/AndroidManifest.xml`-এ existing main `<activity>` element-এর **ভিতরে**, existing launcher filter-এর পাশাপাশি এই filter add করুন:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.jakaria.jpms" android:host="auth" />
</intent-filter>
```

Existing launcher intent filter মুছবেন না। Generated activity-এর `android:exported` ও launch-mode settings বজায় রাখুন।

`NativeLinks.jsx` registers Capacitor `App.appUrlOpen` and checks `App.getLaunchUrl()` on startup. It accepts the configured protocol/host, creates the Supabase session from the returned implicit-flow tokens, and routes recovery links to `/reset-password`. Test with the app both already running and fully closed. Never paste real token-bearing links into logs, screenshots or source control.

This personal-use adapter uses a custom scheme and the configured Supabase implicit flow. Before distributing a commercial native app, migrate to verified HTTPS Android App Links, a deliberately implemented PKCE/token-exchange flow and platform-protected credential persistence. Changing just `flowType` will not complete that migration: native callback handling and verifier storage also need to change. Verified links bind the domain to your app using an association file and signing certificate. [Capacitor App Links guide](https://capacitorjs.com/docs/guides/deep-links)

## 4. Run এবং debug APK

Android Studio-তে Gradle sync শেষ হতে দিন। SDK Manager-এর প্রয়োজনীয় packages install করুন। তারপর emulator বা USB-debugging-enabled phone select করে Run চাপুন।

Terminal-এ debug APK তৈরি করতে macOS/Linux:

```bash
cd android
./gradlew assembleDebug
```

Windows PowerShell:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Default output: `android/app/build/outputs/apk/debug/app-debug.apk` (project root থেকে)। Signed release-এর জন্য Android Studio-এর **Generate Signed App Bundle or APK** flow ব্যবহার করুন; signing keystore নিজের কাছে নিরাপদে রাখুন। Play publishing-এর policies ও signing configuration release-এর সময় official Android guidance অনুযায়ী যাচাই করুন।

## 5. Native exports ও reminders

`src/services/export.js` browser-এ Blob download করে। Native runtime-এ `@capacitor/filesystem` দিয়ে UTF-8 JSON/CSV cache file লিখে `@capacitor/share` দিয়ে share sheet খোলে। Android default cache-file sharing configuration ব্যবহার করা হয়েছে; physical device-এ save/share target দিয়ে যাচাই করুন। Exports contain personal data and temporary cache copies can remain until the OS/app clears them.

Reminder inbox API-driven এবং persisted। Browser Notification permission Android native background push permission নয়। This package has no scheduled local-notification plugin, FCM push backend, offline database or background sync. Add and verify those separately if you need reminders with the app terminated.

## 6. Device acceptance

- Signup confirmation and password recovery from real email, warm and cold app starts; expired links fail clearly.
- Login, logout and session refresh; returning from background must not expose the previous user's data after account change.
- Safe areas, keyboard overlap, table scroll, date/time inputs, modals, screen rotation, font scaling and Android back behaviour.
- Avatar picker/upload and signed-image display.
- Finance CSV, attendance CSV and JSON export through at least one installed share/save target.
- Network loss during payment/repayment: check saved history before entering a new receipt; the same still-open form retains its submission ID.
- Timezone reminders and date boundaries on the actual device.

Use a test account first. APK compilation and these device checks were not performed in the delivered source environment.
