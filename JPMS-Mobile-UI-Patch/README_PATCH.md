# JPMS — Mobile UI & Profile Photo Patch

এই patch আগের **JPMS-Complete-Source.zip / JPMS v1.0.0** project-এর জন্য। এতে শুধু **৮টি new/updated source file** এবং এই installation guide ও validation report আছে। এটি standalone project নয়।

## কী পরিবর্তন হয়েছে

1. **Simple mobile home:** বড় dashboard/chart/list-এর পরিবর্তে greeting, একটি savings card, চলতি মাসের আয়-ব্যয়, Add expense/Add income এবং আজকের task count। বিস্তারিত desktop dashboard থাকে। Mobile layout আগের navigation-এর মতোই **780 CSS pixels বা কম** viewport-এ ব্যবহৃত হয়।
2. **Bottom navigation-এর মাঝখানে +:** Home · Finance · **+ Add** · Tuition · Tasks। + চাপলে সরাসরি **Expense** selected অবস্থায় form খোলে। একই form-এ **Income** নির্বাচন করা যায়। Settings পাওয়া যাবে top bar-এর profile photo অথবা navigation drawer-এ।
3. **সহজ transaction form:** amount আগে, বড় input ও decimal keyboard hint; category/date; title optional। Title খালি রাখলে category-র নাম save হয়। Note optional এবং collapsible। Expense/Income পরিবর্তন করলে amount/date/title থাকে, category valid default-এ যায়।
4. **Easy access:** Home এবং Finance-এ আলাদা **Add expense** ও **Add income** button। Mobile-এ form নিচ থেকে sheet আকারে খোলে; desktop-এ modal।
5. **Profile photo fix:** একই saved photo Settings, desktop sidebar, top bar ও mobile drawer-এ দেখানো হয়। নতুন photo upload-এর পর profile cache update হয়; সব জায়গা একই private signed image URL ব্যবহার করে। Image unavailable হলে initials fallback থাকে।

নতুন SQL, database migration, environment variable বা npm dependency লাগবে না। Existing payments, student records, loans ও business data এই patch-এর অংশ নয়।

## কোন ফাইল Add / Replace করবেন

Paths আপনার existing project root থেকে; যেখানে `package.json` আছে।

| Action      | File                                       |
| ----------- | ------------------------------------------ |
| **ADD**     | `src/components/ProfileAvatar.jsx`         |
| **ADD**     | `src/features/finance/TransactionForm.jsx` |
| **REPLACE** | `src/components/ui.jsx`                    |
| **REPLACE** | `src/layouts/AppLayout.jsx`                |
| **REPLACE** | `src/features/dashboard/Dashboard.jsx`     |
| **REPLACE** | `src/features/finance/Finance.jsx`         |
| **REPLACE** | `src/features/settings/Settings.jsx`       |
| **REPLACE** | `src/styles.css`                           |

সব ৮টি file একসঙ্গে apply করুন। নতুন দুইটি component বাদ গেলে import error হবে। নিজের project-এ এই files আগে আলাদাভাবে edit করে থাকলে backup রেখে changes merge করুন।

## Step by step — Web

1. Running dev server থাকলে `Ctrl+C` দিয়ে বন্ধ করুন।
2. আপনার existing project folder-এর একটি backup copy রাখুন।
3. Patch ZIP আলাদা folder-এ extract করুন।
4. Patch-এর `src`-এর **ভিতরের files/folders** আপনার project-এর `src`-এ একই path রেখে copy/merge করুন; উপরের ছয়টি file-এর overwrite prompt accept করুন। **পুরো existing `src` folder delete করবেন না**—অন্য modules সেখানে থাকবে।
5. `package.json`-এর folder থেকে terminal-এ চালান:

```bash
npm run build
npm run dev
```

Dependencies আগের project-এ installed থাকলে নতুন install দরকার নেই। Freshly extracted base source হলে একবার `npm ci` দিয়ে তারপর build/dev চালান।

6. Mobile browser অথবা narrow window-এ app খুলুন। পুরোনো UI দেখালে browser refresh/hard refresh করুন।
7. Vercel ব্যবহার করলে আটটি source file commit/push করে redeploy করুন। Existing environment variables ব্যবহার করুন।

`README_PATCH.md` ও `PATCH-VALIDATION.txt` শুধু নির্দেশনা/verification; চাইলে project root-এ রাখতে পারেন। পুরোনো `SOURCE-MANIFEST.sha256` base release-এর checksum list, এই patch apply হওয়ার পর পরিবর্তিত source-এর hashes আলাদা হবে।

## Step by step — Existing Android project

আগে source files apply করুন। Project root থেকে:

```bash
npm run android:sync
npm run android:open
```

`android:sync` web code build করে Android project-এ copy করে। Android Studio-তে rebuild/run বা updated APK তৈরি করে install করুন। শুধু `src` replace করলে আগের installed APK নিজে update হবে না। Existing `android` folder থাকলে `android:add` আবার চালানোর প্রয়োজন নেই।

Android project এখনও তৈরি না করলে আগের `docs/MOBILE.md` অনুসরণ করুন।

## Apply করার পরে দেখুন

- Phone-width home-এ বড় charts ও সব KPI list-এর পরিবর্তে সংক্ষিপ্ত home আছে।
- Bottom-এর মাঝের + চাপলে Expense form খোলে; Income বেছে amount/category দিয়ে save করা যায়। পরেরবার + খুললে আবার Expense default হয়।
- Empty title দিয়ে save করলে selected category title হিসেবে থাকে। Invalid/negative/too-many-decimal amounts validation error দেয়।
- Finance-এর Add/Edit buttons কাজ করে; Finance button দিয়ে save-এর পরে saved type/month-এর records দেখায়। Existing tuition/batch receipt income আগের মতো receipt থেকেই edit করতে হয়।
- Settings-এ photo update করলে sidebar/top bar/drawer-এ একই photo আসে। আগে থেকে saved photo থাকলে নতুন করে upload করার প্রয়োজন নেই।
- Dark mode, narrow screen, keyboard এবং modal close/save নিজের phone-এ একবার পরীক্ষা করুন।

## Validation

Existing **18 automated domain/PostgreSQL tests passed** এবং **production build passed**। Exact output `PATCH-VALIDATION.txt`-এ আছে। Patch-এর source files মূল ZIP-এর সঙ্গে compare করে শুধু পরিবর্তিত ফাইল নেওয়া হয়েছে।

Browser visual/interaction testing, আপনার live Supabase photo upload এবং physical Android device/APK testing এখানে করা হয়নি। Build success সেই device checks-এর বিকল্প নয়।

## Rollback

Backup থেকে ছয়টি replaced file ফিরিয়ে দিন, উপরের দুইটি added file সরিয়ে দিন এবং আবার build করুন। Android হলে sync ও rebuild করুন। Database rollback প্রয়োজন নেই।
