# JPMS — Reliability Review Patch

JPMS-এর current source, data flows, database relationships/RLS, হিসাব ও forms review করে ৬টি সমস্যা ঠিক করা হয়েছে। এই ZIP-এ **১৫টি নতুন/পরিবর্তিত project file** আছে; এটি সম্পূর্ণ project নয়।

## কী ঠিক হয়েছে

| অংশ | আগের সমস্যা | এখন কী হবে |
| --- | --- | --- |
| Finance | From/To filter বদলালেও উপরের totals শুধু মাসের হিসাব দেখাত; month clear করলেও cards current month দেখাত | Cards ও CSV একই month/date range ব্যবহার করে; month clear করলে all-time totals আসে |
| Refresh / loading | Background refresh ব্যর্থ হলে cached data-ও লুকিয়ে যেত | Last loaded data থাকে, refresh error message ও retry button দেখা যায় |
| Theme | System dark mode-এ প্রথম toggle click dark-ই রেখে দিতে পারত; storage write fail হলে choice হারাত | Actual light/dark state অনুযায়ী toggle কাজ করে; storage blocked থাকলেও চলতি session-এর choice থাকে |
| Environment | Extra quotes/newline বা malformed values থেকে অস্পষ্ট fetch error হতে পারত | বাইরের whitespace/quotes পরিষ্কার হয়; ভিতরের malformed value হলে স্পষ্ট setup error দেখা যায় |
| Google account password | শুধু Google দিয়ে তৈরি account-কেও পুরোনো JPMS password দিতে হতো | পুরোনো JPMS password না থাকলে blank রেখে নতুনটি তৈরি করার form পাওয়া যায় |
| Date / month | Page দীর্ঘক্ষণ খোলা থাকলে date এবং default report month পুরোনো থাকতে পারত | Profile timezone অনুযায়ী calendar update হয়; নিজে বেছে নেওয়া date/month অপরিবর্তিত থাকে |

আগের attendance dropdown fix এই version-এ আছে। Mobile home, মাঝের + button, profile photo ও Google sign-in-এর আগের কাজ বজায় রাখা হয়েছে।

## Install — ধাপে ধাপে

1. বর্তমান project folder-এর backup রাখুন।
2. ZIP extract করুন। Inside-এর `src` ও `tests` আপনার existing project-এর **একই path-এ merge/copy** করুন। Matching file replace করুন এবং নতুন file-গুলোও add করুন। পুরো `src` folder মুছবেন না।
3. Project root-এ terminal খুলে চালান:

```bash
npm test
npm run build
```

4. নতুন ও পরিবর্তিত সব file Vercel-connected Git repository-তে commit/push করুন। নতুন deployment `Ready` হতে দিন। Auto-deploy বন্ধ থাকলে updated commit deploy করুন।
5. Website hard refresh করুন: Windows-এ `Ctrl + Shift + R`।

**নতুন dependency বা Supabase SQL migration লাগবে না।** Existing `package.json`, lockfile এবং database schema রাখা হয়েছে। Source folder-এ dependencies আগে থেকে install না থাকলে existing lockfile দিয়ে `npm ci` করে নিন।

এই patch আগের JPMS ও Mobile UI Patch-এর ওপর তৈরি। Google login আগেই add করা থাকলে সেটিও থাকবে; এই ZIP আলাদাভাবে Google provider enable করে না। Google Console/Supabase setup-এর জন্য আগের Google patch-এর README অনুসরণ করুন। এই patch বসানোর পরে পুরোনো Mobile UI/Google/Attendance patch দিয়ে একই file আবার overwrite করবেন না।

## Environment error এলে

Vercel Production environment-এ:

| Key | Expected value |
| --- | --- |
| `VITE_SUPABASE_URL` | আপনার project origin, যেমন `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; legacy `VITE_SUPABASE_ANON_KEY`-ও supported |
| `VITE_APP_URL` | আপনার website origin, যেমন `https://pmsj.vercel.app` |

উপরের `YOUR_PROJECT` placeholder নিজের URL দিয়ে বদলাবেন। URL-এর সঙ্গে `/auth/v1/callback`, `/login`, query string বা extra text দেবেন না। Public key একটি line-এ দিন। বাইরের whitespace/quotes সরানো হলেও মাঝখানের line break-সহ malformed key reject হবে; সঠিক value আবার copy করুন। কোনো secret/service-role key frontend-এ ব্যবহার করবেন না।

Vercel-এ public `VITE_` values **Config** হিসেবে রাখুন। Environment বদলালে নতুন build/redeploy প্রয়োজন। [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)

## Google account থেকে password সেট করা

Settings → **Set / change password** খুলুন। আগে JPMS password তৈরি না করে শুধু Google দিয়ে register করে থাকলে Current password blank রেখে new password ও confirmation দিন। Google-এর password এখানে দেবেন না। আগে JPMS password তৈরি করে থাকলে সেটি দিন। Email/linked account-এর existing current-password requirement রাখা হয়েছে।

Supabase-এর password-strength/current-password/reauthentication settings server-এ কার্যকর থাকবে। Reauthentication প্রয়োজন হলে নতুন করে login করে চেষ্টা করুন; live provider configuration এই patch থেকে বদলানো হয়নি। [Supabase password security](https://supabase.com/docs/guides/auth/password-security)

## Finance filter কীভাবে কাজ করে

Cards ও export **month + From/To date range** অনুযায়ী হিসাব করে। Month ও date range দুটো দিলে তাদের common সময়সীমা ব্যবহার হয়। Category/search transaction list ও নিচের filtered total-এর জন্য; cards/CSV-তে উভয় income ও expense থাকে। Invalid From/To range থাকলে export বন্ধ থাকে এবং range error দেখায়।

## Date update

Page খোলা থাকলে minute tick এবং app-এ focus/ফিরে আসার সময় profile timezone-এর date যাচাই হয়। Default month/date নতুন দিনে বা মাসে বদলায়। Historical date/month নিজে select করলে তা বদলাবে না। এটি background notification, offline database বা native alarm feature নয়।

## Deployment-এর পরে সংক্ষিপ্ত check

1. Finance-এ month clear করুন; all-time totals দেখুন। তারপর From/To দিয়ে cards ও CSV মিলিয়ে নিন।
2. Tuition ও batch-এ Present → Absent → Cancelled save করে refresh দিন; note ও status থাকছে কিনা দেখুন।
3. Settings/toolbar theme toggle করুন; system dark mode-এ প্রথম click-এই light হওয়া উচিত।
4. Google-only account-এ আগে JPMS password না থাকলে current password blank রেখে setup flow ব্যবহার করুন।
5. Profile, task, payment ও loan-এর প্রয়োজনীয় save/edit flow নিজের account-এ যাচাই করুন।

Existing Android project-এর APK update করতে:

```bash
npm run android:sync
npm run android:open
```

তারপর Android Studio থেকে rebuild/install করুন। Vercel deployment পুরোনো bundled APK-এর code নিজে বদলায় না।

## File list

| Action | Path |
| --- | --- |
| Replace | `src/components/ui.jsx` |
| Replace | `src/features/auth/AuthProvider.jsx` |
| Replace | `src/features/dashboard/Dashboard.jsx` |
| Replace | `src/features/finance/Finance.jsx` |
| Replace | `src/features/settings/Settings.jsx` |
| Replace | `src/features/teaching/AttendancePanel.jsx` |
| Replace | `src/features/teaching/BillingPanel.jsx` |
| Replace | `src/hooks/useTheme.js` |
| Add | `src/hooks/useToday.js` |
| Replace | `src/layouts/AppLayout.jsx` |
| Add | `src/lib/config.js` |
| Replace | `src/lib/supabase.js` |
| Replace | `src/pages/SetupPage.jsx` |
| Add | `src/utils/finance.js` |
| Add | `tests/reliability.test.js` |

## Verification ও সীমা

**৩০টি automated test এবং production build পাস করেছে।** আলাদা targeted checks-এ actual callback/component source দিয়ে attendance, refresh failure, theme, calendar rollover এবং password form payload যাচাই হয়েছে। বিস্তারিত `REVIEW-VALIDATION.txt` ও `REVIEW-RESULTS.md`-এ আছে।

এটি local source/test review। আপনার live Supabase data, Vercel deployment, browser interaction বা physical APK এখানে পরীক্ষা করা হয়নি। তাই live environment-এর সব সম্ভাব্য error চলে গেছে—এমন দাবি করা হচ্ছে না।
