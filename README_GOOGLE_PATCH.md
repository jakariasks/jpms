# JPMS — Google Login Patch

Login ও registration পেজে **Continue with Google** যোগ করা হয়েছে। বাটন চাপলে email/password form পূরণ করতে হবে না। Google sign-in শেষ হলে Supabase session দিয়ে dashboard খুলবে।

**শুধু ফাইল replace করলেই Google login চালু হবে না: নিচের Google Console ও Supabase setup একবার করতে হবে।** আপনার account-এর provider settings এই patch থেকে পরিবর্তন করা হয়নি।

## 1. Patch install করুন

1. বর্তমান project folder-এর একটি backup রাখুন।
2. ZIP extract করুন। ভিতরের `src`, `tests`, `package.json` ও `package-lock.json` আপনার project-এর **একই path-এ** copy/replace করুন। Project root হলো যে folder-এ আগের `package.json` আছে।
3. Folder **merge** করবেন; পুরো পুরোনো `src` folder মুছে নতুন ছোট `src` বসাবেন না। নতুন `src/assets` folder না থাকলে তৈরি করুন।
4. Project root-এ terminal খুলে চালান:

```bash
npm ci
npm run build
```

Node 22.12+ প্রয়োজন; Node 24 দিয়ে এই patch build করা হয়েছে। `npm ci` প্রয়োজন কারণ native Google login-এর জন্য `@capacitor/browser` যোগ হয়েছে।

এটি আগের JPMS complete source এবং তার Mobile UI Patch-এর সঙ্গে ব্যবহারযোগ্য। Google patch-এ আগের mobile dashboard, মাঝের + button ও uploaded profile photo-এর ফাইল নেই; সেগুলো আপনার project-এই থাকবে। অন্য কোনোভাবে নিজে auth files বা dependencies বদলে থাকলে backup-এর সঙ্গে মিলিয়ে merge করুন। নতুন SQL চালানো লাগবে না।

## 2. প্রথমে Supabase callback URL কপি করুন

[Supabase Dashboard](https://supabase.com/dashboard) → আপনার project → **Authentication → Sign In / Providers → Google** খুলুন। Dashboard version অনুযায়ী menu-টি `Providers` নামেও থাকতে পারে।

সেখানে দেওয়া **Callback URL (for OAuth)** কপি করুন। সাধারণত এর format:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

`YOUR_PROJECT_REF` placeholder কপি করবেন না; dashboard থেকে পাওয়া সম্পূর্ণ URL ব্যবহার করুন। Google Console-এ এই Supabase URL লাগে। [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 3. Google OAuth client তৈরি করুন

[Google Cloud Console](https://console.cloud.google.com/) খুলে project select/create করুন। এরপর **Google Auth Platform** খুলুন।

1. প্রথমবার হলে **Get started / Branding** থেকে app name `JPMS`, support email এবং contact email দিন।
2. Personal Gmail account-এর জন্য **Audience → External** নির্বাচন করুন। Testing অবস্থায় **Audience → Test users → Add users**-এ নিজের Google email যোগ করে Save করুন। [Google consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent)
3. **Clients → Create client → Web application** নির্বাচন করুন। Client name দিতে পারেন `JPMS Web`।
4. **Authorized JavaScript origins**-এ আপনার website origin যোগ করুন। আপনার আগের screenshot-এর domain অনুযায়ী:

```text
https://pmsj.vercel.app
```

Local development দরকার হলে আরেকটি origin:

```text
http://localhost:5173
```

5. **Authorized redirect URIs**-এ ধাপ 2-এর **Supabase callback URL** paste করুন।
6. Create করে পাওয়া **Client ID** ও **Client Secret** Supabase-এর জন্য রাখুন। এই client তৈরি ও callback mapping Supabase-এর Google provider flow অনুসরণ করে। [Official client configuration](https://supabase.com/docs/guides/auth/social-login/auth-google)

এই patch শুধু basic Google sign-in ব্যবহার করে; Gmail বা Drive access scope যোগ করার প্রয়োজন নেই।

## 4. Supabase-এ Google enable করুন

Google provider page-এ ফিরে:

1. **Enable Sign in with Google** চালু করুন।
2. Google-এর **Client ID** ও **Client Secret** সংশ্লিষ্ট field-এ paste করুন।
3. **Save** করুন। Client Secret শুধু Supabase provider settings-এ থাকবে; React source, GitHub বা কোনো `VITE_` variable-এ রাখবেন না। [Supabase provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 5. Supabase-এর app redirect ঠিক করুন

**Authentication → URL Configuration** খুলুন। আপনার actual domain আলাদা হলে নিচের সব app URL-এ সেই domain বসান।

**Site URL:**

```text
https://pmsj.vercel.app
```

**Redirect URLs**-এ যোগ করুন:

```text
https://pmsj.vercel.app/auth/callback
https://pmsj.vercel.app/reset-password
```

Local development ব্যবহার করলে যোগ করুন:

```text
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
```

Existing প্রয়োজনীয় redirect URLs রেখে দিন। OAuth শেষে app-এর `redirectTo` এই allowlist-এর সঙ্গে মিলতে হবে। [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)

দুটি callback-এর পার্থক্য:

| কোথায় বসাবেন | কী URL বসাবেন |
| --- | --- |
| Google Console → Authorized redirect URIs | Supabase provider page-এর `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` |
| Supabase → Redirect URLs | আপনার app-এর `https://pmsj.vercel.app/auth/callback` |

Google প্রথমে Supabase-এ ফেরত আসে; Supabase তারপর JPMS-এ ফেরত পাঠায়। Google Console-এ app-এর `/auth/callback` বসালে এই flow-এ `redirect_uri_mismatch` হতে পারে।

## 6. Vercel environment ও deployment

Vercel → project → **Settings → Environment Variables**-এ Production environment-এর values মিলিয়ে নিন:

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | আপনার Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | একই project-এর publishable key; existing `VITE_SUPABASE_ANON_KEY` fallback-ও supported |
| `VITE_APP_URL` | `https://pmsj.vercel.app` — শুধু origin, `/login` বা `/auth/callback` ছাড়া |

Values-এ quotes, অতিরিক্ত space বা line break রাখবেন না। Client ID/Secret নতুন frontend variable হিসেবে লাগবে না।

আপনার আগের screenshot-এর **“Remove the public framework prefix…”** error হলে: এই `VITE_` values frontend-এ ব্যবহৃত হয়, তাই Vercel-এ **Config** type দিন। Existing Secret-এর Config option disabled থাকলে সঠিক public value হাতে রেখে ওই variable delete করে **একই key name** দিয়ে Config হিসেবে আবার তৈরি করুন। `VITE_` prefix সরাবেন না। Supabase `service_role` / `sb_secret_` key frontend-এ ব্যবহার করবেন না। [Vercel sensitive variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

তারপর changed/new files আপনার Vercel-connected Git repository-তে commit/push করুন। নতুন deployment তৈরি হতে দিন। Environment variable পরে বদলালে **Deployments → latest deployment → Redeploy** করুন; পুরোনো build-এ নতুন value ঢোকে না। [Vercel environment updates](https://vercel.com/docs/environment-variables/managing-environment-variables)

Local development-এর `.env`-এ `VITE_APP_URL=http://localhost:5173` দিন; Vercel Production-এ website-এর HTTPS origin দিন। Preview deployment পরীক্ষা করতে হলে তার exact origin ও `/auth/callback` allowlist করুন এবং সেই build-এর `VITE_APP_URL` মিলিয়ে নিন।

## 7. নিজের account দিয়ে যাচাই করুন

1. Deployed app-এর `/login` খুলুন; আগেই logged in থাকলে logout করুন।
2. **Continue with Google** চাপুন। Google account select করে এগোন।
3. App-এর dashboard খুলছে কিনা দেখুন। Refresh করে session থাকে কিনা এবং logout কাজ করে কিনা দেখুন।
4. `/register`-এর Google button দিয়েও form পূরণ ছাড়াই sign-in শুরু হওয়া উচিত। Google screen থেকে Back/cancel করলে আবার চেষ্টা করতে পারবেন।
5. Existing email/password login ও forgot password আগের মতো যাচাই করুন।

আগের data পেতে আগের JPMS account-এর **একই verified email-এর Google account** ব্যবহার করুন। Supabase তার identity-linking rules অনুযায়ী একই email-এর identity link করতে পারে; ভিন্ন email নিলে সাধারণত আলাদা user/workspace হবে। এই patch আলাদা users-এর data merge করে না। [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

## 8. Android / Capacitor ব্যবহার করলে

Google button native runtime-এ `@capacitor/browser` দিয়ে system browser tab খোলে। Return URL native link handler-এ গিয়ে Supabase session তৈরি করে। [Capacitor Browser](https://capacitorjs.com/docs/apis/browser)

Supabase **Redirect URLs**-এ যোগ করুন:

```text
com.jakaria.jpms://auth/callback
com.jakaria.jpms://auth/recovery
```

Existing Android project-এ চালান:

```bash
npm ci
npm run android:sync
npm run android:open
```

`android/` folder এখনো না থাকলে আগে main project-এর `docs/MOBILE.md` অনুসরণ করুন। `android:add` শুধু প্রথমবার চালাবেন।

`android/app/src/main/AndroidManifest.xml`-এর main `<activity>`-এর ভিতরে নিচের intent filter থাকতে হবে। আগেই থাকলে আবার যোগ করবেন না; launcher filter রেখে দিন:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.jakaria.jpms" android:host="auth" />
</intent-filter>
```

এটি আগে থেকেই থাকা `com.jakaria.jpms` app ID/scheme-এর জন্য। নিজের app ID বদলে থাকলে auth redirect, native parser, manifest এবং Supabase allowlist একসঙ্গে মিলিয়ে নিন। Google Console-এর redirect URI এখানেও Supabase callback-ই থাকবে। [Supabase mobile deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

এই patch existing implicit auth flow রাখে। Commercial native release-এর verified HTTPS App Links ও PKCE migration বিষয়ে আগের `docs/MOBILE.md` অনুসরণ করুন। কেবল `flowType` বদলালে native callback কাজ করবে না। Android build/device Google login এখানে পরীক্ষা করা হয়নি; app খোলা ও সম্পূর্ণ বন্ধ—দুই অবস্থায় device-এ যাচাই করুন।

## 9. সমস্যা হলে

| Error / লক্ষণ | কী মিলিয়ে দেখবেন |
| --- | --- |
| `Unsupported provider` / provider not enabled | Supabase-এর সঠিক project-এ Google enable করে Save হয়েছে কিনা |
| `redirect_uri_mismatch` | Google Web client-এর redirect URI হুবহু Supabase provider callback কিনা |
| `invalid_client` | Supabase-এ একই Google Web client-এর সঠিক ID ও Secret আছে কিনা |
| `access_denied` | Sign-in cancel করা হয়েছে কিনা; Google Audience/test-user বা organization restriction আছে কিনা |
| Login শেষে localhost/পুরোনো domain খুলছে | `VITE_APP_URL`, Supabase Site URL/Redirect URLs মিলিয়ে Vercel redeploy করুন |
| `/auth/callback` refresh-এ 404 | Original project-এর `vercel.json` SPA rewrite repository-তে আছে কিনা |
| APK থেকে browser-এ আটকে আছে | Native redirect allowlist, manifest scheme/host ও `android:sync` যাচাই করুন |
| আগের `fetch ... Invalid value` error | Supabase URL/public key আবার single-line value হিসেবে copy করে Vercel Config-এ Save ও Redeploy করুন; Google enable করা malformed env ঠিক করে না |

## Included files

| Action | Path |
| --- | --- |
| Replace | `package.json` |
| Replace | `package-lock.json` |
| Replace | `src/features/auth/AuthPage.jsx` |
| Replace | `src/features/auth/AuthCallback.jsx` |
| Replace | `src/features/auth/NativeLinks.jsx` |
| Add | `src/features/auth/authLinks.js` |
| Add | `src/features/auth/google-auth.css` |
| Add | `src/assets/google-g.png` |
| Add | `tests/auth-links.test.js` |

README, validation report ও SHA-256 manifest patch-এর সঙ্গে দেওয়া আছে। `.env`, credentials, `node_modules` ও compiled `dist` অন্তর্ভুক্ত নয়।

## Implementation notes and validation

- Google sign-in Supabase-এর existing Auth session ও user ID ব্যবহার করে; database profile trigger নতুন user-এর name/email তৈরি করে। তাই দ্বিতীয় authentication database বা নতুন migration প্রয়োজন হয়নি।
- Google button email form-এর বাইরে আছে; empty email/password থাকলেও OAuth শুরু হবে। Pending অবস্থায় duplicate click বন্ধ থাকে। Browser Back করে ফিরলে busy state reset হয়।
- Web callback SDK-এর existing implicit session handling ব্যবহার করে। Native callback শুধু নির্দিষ্ট scheme/host/path গ্রহণ করে, incomplete tokens প্রত্যাখ্যান করে এবং duplicate delivery এড়ায়। Recovery routing রাখা হয়েছে।
- Auth styling আলাদা CSS file-এ থাকায় আগের mobile patch-এর stylesheet replace করতে হয় না। Google icon স্থানীয় asset হিসেবে bundle হয়; source: [Google G asset](https://developers.google.com/static/identity/images/g-logo.png), [branding guidance](https://developers.google.com/identity/branding-guidelines)।
- **23 automated tests passed; production build passed.** বিস্তারিত `GOOGLE-PATCH-VALIDATION.txt`-এ আছে। Live Google/Supabase sign-in এবং device/browser UI পরীক্ষা এই পরিবেশে করা হয়নি। উপরের provider setup শেষে ধাপ 7 অনুসরণ করুন।
