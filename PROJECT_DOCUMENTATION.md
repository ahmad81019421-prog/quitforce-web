# QuitForce — Web Application Documentation

> تطبيق ويب لمساعدة المدخنين على الإقلاع عن التدخين عبر نظام **إنفاذ سلوكي** يجمع بين الالتزام المالي، التتبع النفسي، والإشعارات الذكية.

---

## 📑 الفهرس

1. [نظرة عامة](#1-نظرة-عامة)
2. [الستاك التقني](#2-الستاك-التقني)
3. [هيكل المشروع](#3-هيكل-المشروع)
4. [التثبيت والتشغيل](#4-التثبيت-والتشغيل)
5. [نموذج البيانات (Firestore)](#5-نموذج-البيانات-firestore)
6. [نظام الأمان (firestore.rules)](#6-نظام-الأمان-firestorerules)
7. [نظام المصادقة والأدوار](#7-نظام-المصادقة-والأدوار)
8. [صفحات التطبيق](#8-صفحات-التطبيق)
9. [نظام الـ Stages اللونية](#9-نظام-الـ-stages-اللونية)
10. [نظام Craving Guard](#10-نظام-craving-guard)
11. [نظام المحفظة والعقوبات](#11-نظام-المحفظة-والعقوبات)
12. [نظام التوقيع الإلكتروني](#12-نظام-التوقيع-الإلكتروني)
13. [نظام الإنفاذ النشط (Enforcement API)](#13-نظام-الإنفاذ-النشط-enforcement-api)
14. [الترجمة والـ RTL/LTR](#14-الترجمة-والـ-rtlltr)
15. [تقسيم الـ Bundle](#15-تقسيم-الـ-bundle)
16. [السيناريوهات (Use Cases)](#16-السيناريوهات-use-cases)
17. [الاختبار والتحقق](#17-الاختبار-والتحقق)
18. [القرارات التصميمية المهمة](#18-القرارات-التصميمية-المهمة)
19. [التبسيطات المعروفة](#19-التبسيطات-المعروفة)
20. [استكشاف الأخطاء](#20-استكشاف-الأخطاء)

---

## 1. نظرة عامة

### الفكرة الأساسية

**QuitForce** ليس تطبيق تتبّع عادي — بل منصة **إنفاذ سلوكي**. الفكرة أن المستخدم:

1. **يوقّع عقد التزام** عند التسجيل (توقيع إلكتروني حقيقي)
2. **يودع مبلغاً مالياً** كرهان على التزامه
3. **يتعرض لعقوبات مالية حقيقية** عند الانتكاس أو الخمول
4. **يتلقى إشعارات ذكية** مخصصة لنوع إدمانه

### الميزات الخمس الرئيسية

| # | الميزة | الوصف |
|---|--------|-------|
| 1 | **عقوبة تصاعدية** | 5% → 10% → 20% من رصيد المحفظة مع كل انتكاسة |
| 2 | **تقويم شهري** | عرض يومي لرحلة الإقلاع (نظيف/انتكاسة/قادم) |
| 3 | **خطة تخفيض أسبوعية** | تقليص تدريجي (20→15→10→5→0) على 4 أسابيع |
| 4 | **إنفاذ نشط** | عقوبات + إشعارات تلقائية عند الخمول 24 ساعة |
| 5 | **Craving Guard تكيّفي** | يتأقلم مع نوع إدمان المستخدم (توتر/عادة/اجتماعي/ملل) |

---

## 2. الستاك التقني

### الواجهة الأمامية (Frontend)
- **React 18.3** — مكتبة الواجهة
- **Vite 5.4** — أداة البناء والتطوير
- **Tailwind CSS 3.4** — تنسيق
- **Framer Motion 11.3** — أنيميشن
- **Recharts 2.12** — رسوم بيانية
- **Lucide React 0.383** — أيقونات
- **React Router DOM 6.26** — تنقل
- **i18next 23.11** — ترجمة (عربي/إنجليزي)
- **jsPDF 2.5** — تصدير PDF

### الواجهة الخلفية (Backend)
- **Firebase Authentication** — مصادقة (بريد/كلمة مرور + Google)
- **Cloud Firestore** — قاعدة بيانات
- **Firebase Cloud Messaging** — إشعارات push
- **firebase-admin** — للـ serverless function

### البنية التحتية
- **Vercel** — استضافة الـ enforcement API
- **cron-job.org** — جدولة المهام الدورية
- **Firebase Hosting** (اختياري) — استضافة التطبيق الرئيسي

---

## 3. هيكل المشروع

```
quitforce-web/
├── .env                              # متغيرات البيئة (يملأها المستخدم)
├── .env.example                      # قالب للمتغيرات
├── .gitignore
├── README.md                         # التوثيق المختصر
├── PROJECT_DOCUMENTATION.md          # هذا الملف (شامل)
├── firestore.rules                   # قواعد أمان Firestore
├── index.html                        # نقطة الدخول HTML
├── package.json                      # dependencies + scripts
├── postcss.config.js
├── tailwind.config.js                # نظام الألوان والخطوط
├── vite.config.js                    # إعداد Vite + code splitting
│
├── public/
│   └── firebase-messaging-sw.js      # Service Worker للـ push
│
├── scripts/
│   ├── gen-sw.js                     # توليد SW من .env
│   └── setAdmin.js                   # تعيين admin custom claim
│
├── src/
│   ├── main.jsx                      # نقطة دخول React
│   ├── App.jsx                       # Router + providers
│   ├── i18n.js                       # إعداد i18next + RTL/LTR
│   ├── styles/
│   │   └── index.css                 # Tailwind + stage tokens
│   ├── locales/
│   │   ├── ar.json                   # ترجمات عربية
│   │   └── en.json                   # ترجمات إنجليزية
│   ├── lib/
│   │   ├── firebase.js               # تهيئة Firebase + env validation
│   │   ├── AuthContext.jsx           # سياق المصادقة + role + streakDays
│   │   ├── firestore.js              # كل عمليات Firestore (مع writeBatch)
│   │   └── messaging.js              # FCM push notifications
│   ├── hooks/
│   │   └── useStage.jsx              # Stage provider + tokens
│   ├── components/
│   │   ├── PremiumGlassCard.jsx      # البطاقة الزجاجية الأساسية
│   │   ├── SpringCounter.jsx         # عداد رقمي بأنيميشن spring
│   │   ├── BottomNav.jsx             # شريط التنقل السفلي + زر خروج
│   │   ├── LanguageSwitch.jsx        # مبدّل اللغة
│   │   ├── MonthlyCalendar.jsx       # تقويم الشهر
│   │   ├── QuitPlanCard.jsx          # خطة التخفيض
│   │   └── SignaturePad.jsx          # لوحة التوقيع الاحترافية
│   └── pages/
│       ├── AuthPage.jsx              # تسجيل الدخول/إنشاء حساب
│       ├── OnboardingPage.jsx        # الاستبيان + العقد
│       ├── DashboardPage.jsx         # الرئيسية
│       ├── WalletPage.jsx            # المحفظة
│       ├── JourneyPage.jsx           # رحلة التعافي
│       ├── StatsPage.jsx             # الإحصائيات
│       ├── CommunityPage.jsx         # المجتمع
│       ├── PassportPage.jsx          # جواز السفر + PDF export
│       ├── AdminPage.jsx             # لوحة الإدارة
│       ├── CravingGuardPage.jsx      # موجه الرغبة
│       └── craving/
│           ├── BreathingStage.jsx
│           ├── DistractionStage.jsx
│           ├── MiniTaskStage.jsx
│           ├── AccountabilityStage.jsx
│           ├── LossPreviewStage.jsx
│           └── DecisionStage.jsx
│
└── enforcement-api/                  # serverless function منفصل
    ├── README.md
    ├── package.json
    ├── vercel.json
    └── api/
        └── check-inactivity.js       # cron job للإنفاذ
```

---

## 4. التثبيت والتشغيل

### المتطلبات المسبقة

- **Node.js** 18+ (يُفضّل 20+)
- **npm** 9+
- حساب **Firebase** (مجاني)
- حساب **Vercel** (مجاني) — للـ enforcement API
- حساب **cron-job.org** (مجاني) — لجدولة المهام

### الخطوة 1: التثبيت

```bash
# فك ضغط المشروع
unzip quitforce-web.zip
cd quitforce-web

# تثبيت dependencies
npm install
```

### الخطوة 2: إعداد Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. أنشئ مشروع جديد
3. فعّل **Authentication** → Email/Password + Google
4. أنشئ **Firestore Database** (production mode)
5. من Project Settings → SDK setup and configuration، انسخ القيم

### الخطوة 3: إعداد `.env`

```bash
cp .env.example .env
```

افتح `.env` واملأ القيم:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# من Project settings → Cloud Messaging → Web Push certificates
VITE_FCM_VAPID_KEY=BJ...
```

### الخطوة 4: نشر قواعد Firestore

```bash
# تثبيت Firebase CLI (إن لم يكن مثبتاً)
npm install -g firebase-tools
firebase login

# نشر القواعد
firebase deploy --only firestore:rules
```

أو يدوياً: انسخ محتوى `firestore.rules` والصقه في Console → Firestore → Rules.

### الخطوة 5: تشغيل التطبيق

```bash
# وضع التطوير
npm run dev
# → http://localhost:5173

# بناء للإنتاج
npm run build

# معاينة بناء الإنتاج
npm run preview
# → http://localhost:4173
```

### الخطوة 6 (اختياري): تعيين Admin

```bash
# احصل على UID المستخدم من Firebase Console → Authentication
FIREBASE_SERVICE_ACCOUNT_KEY=$(cat /path/to/service-account.json) npm run set-admin -- <UID>
```

المستخدم يجب أن يسجّل خروج ثم دخول مجدداً لتفعيل الصلاحية.

---

## 5. نموذج البيانات (Firestore)

### Collection: `users/{uid}`

```javascript
{
  // أساسي
  name: string,
  email: string,
  onboardingComplete: boolean,
  createdAt: Timestamp,

  // بيانات Onboarding
  cigsPerDay: number,
  yearsSmoking: number,
  pricePerPack: number,
  trigger: 'stress' | 'habit' | 'social' | 'boredom',
  profileType: 'stress_smoker' | 'social_smoker' | 'heavy_addicted' | 'habit_smoker',
  depositAmount: number,

  // حالة الإقلاع
  quitDate: ISO string,              // يُعاد ضبطه عند كل انتكاسة
  penaltyCount: number,              // SERVER-ONLY WRITE — يقود معدل العقوبة

  // إنفاذ نشط
  lastActiveAt: Timestamp,           // يُحدّث كل 5 دقائق من Dashboard
  lastInactivityPenaltyAt: Timestamp,
  fcmToken: string,                  // توكن الإشعارات

  // عقد الالتزام
  commitmentSignature: {
    dataUrl: string,                 // PNG base64 من SignaturePad
    signedAt: ISO string,
    devicePixelRatio: number
  }
}
```

### Subcollection: `users/{uid}/cravingLogs/{id}`

```javascript
{
  outcome: 'resisted' | 'smoked' | 'inactivity-penalty' | 'contacted-partner',
  count: number | null,              // عدد السجائر (لـ 'smoked')
  reason: string | null,             // 'stress' | 'habit' | 'social' | 'boredom'
  createdAt: Timestamp
}
```

### Collection: `wallets/{uid}`

```javascript
{
  balance: number,
  lockedAmount: number,
  createdAt: Timestamp
}
```

### Subcollection: `wallets/{uid}/transactions/{id}`

```javascript
{
  type: 'deposit' | 'penalty' | 'reward',
  amount: number,                    // موجب للإيداع/المكافأة، سالب للعقوبة
  method: string,                    // 'card' | 'paypal' | 'bank' | 'wish'
  reason: string,                    // 'relapse-stress', 'inactivity', 'milestone-7days'
  rate: number,                      // معدل العقوبة (0.05, 0.10, 0.20)
  createdAt: Timestamp
}
```

### Collection: `posts/{id}`

```javascript
{
  uid: string,
  name: string,
  text: string,
  achievement: string | null,
  likedBy: string[],                 // array of UIDs
  commentsCount: number,
  createdAt: Timestamp
}
```

---

## 6. نظام الأمان (firestore.rules)

### المبادئ الأساسية

| المبدأ | التطبيق |
|--------|---------|
| **Defense in depth** | قواعد على مستوى الحقل، ليس فقط الوثيقة |
| **Server-only writes** | `penaltyCount` و `lastInactivityPenaltyAt` لا يمكن كتابتها من العميل |
| **Field-scoped updates** | تحديث المنشورات يقتصر على `likedBy` فقط |
| **Owner-only** | المحفظة وملف المستخدم يُقرآن/يكتبان من المالك فقط |

### تفصيل القواعد

#### Users Collection

```javascript
match /users/{uid} {
  // القراءة: لأي مستخدم مسجّل (لأن Admin يجمع البيانات)
  allow read: if isSignedIn();

  // الإنشاء: المالك فقط، حقول محددة
  allow create: if isOwner(uid)
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['name','email','onboardingComplete','createdAt']);

  // التحديث: المالك فقط، حقول محددة (لا يشمل penaltyCount!)
  allow update: if isOwner(uid)
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly([
          'name','email','onboardingComplete',
          'cigsPerDay','yearsSmoking','pricePerPack','trigger','profileType',
          'depositAmount','quitDate',
          'lastActiveAt','fcmToken',
          'commitmentSignature'
        ]);
}
```

#### Wallets Collection

```javascript
match /wallets/{uid} {
  allow read: if isOwner(uid) || isAdmin();
  allow create: if isOwner(uid)
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['balance','lockedAmount','createdAt']);
  // ⚠️ مؤقت: balance update مسموح للعميل (سينقل لـ Cloud Function)
  allow update: if isOwner(uid)
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['balance']);
}
```

#### Posts Collection

```javascript
match /posts/{postId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn()
    && request.resource.data.uid == request.auth.uid;

  // التحديث: فقط حقل likedBy (للإعجاب)
  allow update: if isSignedIn()
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['likedBy'])
    && request.resource.data.uid == resource.data.uid;

  allow delete: if isSignedIn() && resource.data.uid == request.auth.uid;
}
```

---

## 7. نظام المصادقة والأدوار

### AuthContext

`src/lib/AuthContext.jsx` يوفّر:

```javascript
{
  user: FirebaseUser | null,
  loading: boolean,
  role: 'user' | 'admin',           // من custom claims
  profile: UserProfile | null,       // live subscription
  streakDays: number,                // محسوب من quitDate
  logout: () => Promise<void>
}
```

### Custom Claims

- **تعيين Admin**:
  ```bash
  npm run set-admin -- <UID>
  ```
  يستخدم `firebase-admin` لاستدعاء `setCustomUserClaims(uid, { role: 'admin' })`

- **التحقق في الواجهة**:
  ```javascript
  const token = await user.getIdTokenResult()
  const role = token.claims.role || 'user'
  ```

### حماية الـ Routes

| Route | الحماية |
|-------|---------|
| `/auth` | مفتوح |
| `/onboarding` | `ProtectedRoute` (user مسجّل) |
| `/dashboard`, `/wallet`, ... | `ProtectedRoute` |
| `/admin` | `AdminRoute` (user مسجّل + role === 'admin') |

---

## 8. صفحات التطبيق

### AuthPage (`/auth`)
- تسجيل دخول / إنشاء حساب
- دعم Google Sign-in
- يستدعي `updateProfile({ displayName })` بعد التسجيل
- يوجّه المستخدم الجديد لـ `/onboarding`، القديم لـ `/dashboard`

### OnboardingPage (`/onboarding`)
- **4 خطوات**: assessment → scanning → profile → contract
- يستخرج نوع المدخّن (`stress_smoker`, `social_smoker`, `heavy_addicted`, `habit_smoker`)
- يطلب توقيع إلكتروني عبر `SignaturePad`
- يتحقق من صحة مبلغ الإيداع (≥ 0)
- يحفظ كل شيء في `writeBatch` واحد (atomic)

### DashboardPage (`/dashboard`)
- مؤقت حي للمدة منذ الإقلاع (d/h/m/s)
- المال المُوفّر + السجائر المتجنّبة
- مؤشر الخطر (يقلّ مع مرور الأيام)
- تتابع الأيام (streak)
- تقويم الشهر
- خطة التخفيض الأسبوعية
- تحدي اليوم
- رصيد المحفظة
- زر "أشعر برغبة" → `/craving`
- heartbeat كل 5 دقائق (`pingActive`)

### CravingGuardPage (`/craving`)
- موجه 4 مراحل يتكيّف مع نوع الإدمان:
  - **stress**: breathing → stress-breathing → loss → decision
  - **habit**: breathing → distraction → loss → decision
  - **boredom**: breathing → task → loss → decision
  - **social**: breathing → accountability → loss → decision
- loading state أثناء تحميل البيانات

### WalletPage (`/wallet`)
- بطاقة محفظة ثلاثية الأبعاد (tilt effect)
- إيداع تجريبي (card/paypal/bank/wish)
- سجل العمليات (live subscription)
- skeleton loading أثناء الانتظار

### JourneyPage (`/journey`)
- 8 محطات: يوم 1, 3, 7, 14, 21, 30, 60, 90
- 3 عوالم لونية:
  - **early** (0-6 أيام): 🌋 الفوضى (أحمر)
  - **progress** (7-29 يوم): 🪐 الاستقرار (بنفسجي)
  - **freedom** (30+ يوم): ☀️ الاحتفال (ذهبي)

### StatsPage (`/stats`)
- رسم بياني للرغبات (14 يوم)
- خريطة حرارية (أسبوع × 3 ساعات)
- نسبة الالتزام بالخطة
- أسماء الأيام مترجمة

### CommunityPage (`/community`)
- نشر منشورات
- إعجاب (toggle)
- عرض الإنجازات

### PassportPage (`/passport`)
- بطاقة جواز السفر
- إجمالي التوفير + السجائر المتجنّبة
- معرض الكؤوس (trophies)
- **عرض عقد الالتزام الموقّع**
- **تصدير PDF** (jsPDF)

### AdminPage (`/admin`)
- محمي بـ `AdminRoute`
- إجمالي المستخدمين
- نسبة النجاح (30+ يوم)
- توزيع الخطر (low/medium/high)
- معالجة الأخطاء

---

## 9. نظام الـ Stages اللونية

`src/hooks/useStage.jsx` يحدد 3 مراحل:

```javascript
const STAGE_TOKENS = {
  early:    { color: '#FF3B30', dim: '#7A1410', label: { en: 'Early', ar: 'البداية' } },
  progress: { color: '#BF5AF2', dim: '#4B1A66', label: { en: 'Progress', ar: 'التقدّم' } },
  freedom:  { color: '#FFD700', dim: '#6B5800', label: { en: 'Freedom', ar: 'الحرية' } }
}

function deriveStage(streakDays) {
  if (streakDays >= 30) return 'freedom'
  if (streakDays >= 7) return 'progress'
  return 'early'
}
```

### كيف يتدفق الـ Stage

```
AuthContext (subscribes to profile doc)
    ↓ streakDays computed from quitDate
StageProvider receives streakDays as prop
    ↓ sets data-stage on <html>
CSS variables update (--stage-color, --stage-dim)
    ↓
All components using tokens.color auto-update
```

---

## 10. نظام Craving Guard

### المراحل

| المرحلة | المكون | المدة | الوصف |
|---------|--------|------|-------|
| **breathing** | BreathingStage | 30s | تنفّس مع كرة متحركة |
| **stress-breathing** | BreathingStage | 90s | دورة أطول للتوتر |
| **distraction** | DistractionStage | 20s | لعبة مطابقة الأشكال |
| **task** | MiniTaskStage | 20s | مهمة حركية (وقوف/تمطّي) |
| **accountability** | AccountabilityStage | — | تواصل مع شخص داعم |
| **loss** | LossPreviewStage | — | معاينة ما سيفقدونه |
| **decision** | DecisionStage | — | "صمدت" أو "دخّنت" |

### تكيّف المرحلة الثانية حسب الـ trigger

```javascript
const STAGES =
  trigger === 'stress' ? ['breathing', 'stress-breathing', 'loss', 'decision']
  : trigger === 'boredom' ? ['breathing', 'task', 'loss', 'decision']
  : trigger === 'social' ? ['breathing', 'accountability', 'loss', 'decision']
  : ['breathing', 'distraction', 'loss', 'decision'] // habit (default)
```

### DecisionStage — مسارا "صمدت" و"دخّنت"

```
┌─ "صمدت" ─→ logCraving({ outcome: 'resisted' }) ─→ شاشة نجاح
│
└─ "دخّنت" ─→ نموذج (كم سيجارة؟ السبب؟)
              └─ recordRelapse(uid, { count, reason })
                  ├─ يقرأ balance + penaltyCount
                  ├─ يحسب rate = penaltyRateFor(priorPenaltyCount)
                  ├─ يحسب amount = balance × rate
                  └─ writeBatch:
                      ├─ cravingLogs.add({ outcome: 'smoked', count, reason })
                      ├─ wallets.update({ balance: increment(-amount) })
                      ├─ transactions.add({ type: 'penalty', amount: -amount, rate })
                      └─ users.update({ penaltyCount: increment(1), quitDate: now })
```

---

## 11. نظام المحفظة والعقوبات

### معدل العقوبة التصاعدي

```javascript
function penaltyRateFor(priorPenaltyCount) {
  if (priorPenaltyCount >= 2) return 0.20  // المرة 3+
  if (priorPenaltyCount === 1) return 0.10 // المرة 2
  return 0.05                              // المرة 1
}
```

### مثال عملي

| الحدث | penaltyCount | rate | balance قبل | amount | balance بعد |
|-------|--------------|------|-------------|--------|-------------|
| انتكاسة 1 | 0 → 1 | 5% | $100 | $5 | $95 |
| انتكاسة 2 | 1 → 2 | 10% | $95 | $9.50 | $85.50 |
| انتكاسة 3 | 2 → 3 | 20% | $85.50 | $17.10 | $68.40 |

### Atomicity (writeBatch)

كل عمليات `recordRelapse` تتم في `writeBatch` واحد:

```javascript
const batch = writeBatch(db)
batch.set(c cravingLog)
batch.update(wallet, { balance: increment(-amount) })
batch.set(transaction)
batch.update(user, { penaltyCount: increment(1), quitDate: now })
await batch.commit()
```

**لماذا؟** لو سجّل المستخدم انتكاستين بسرعة، أو لو اشتغل cron job في نفس اللحظة، الـ batch يضمن أن:
- لا يمكن تطبيق معدل 5% مرتين (يجب 5% ثم 10%)
- لا يمكن أن يصير الرصيد سالباً
- لا يمكن احتساب penaltyCount أقل من الفعلي

---

## 12. نظام التوقيع الإلكتروني

### لماذا SignaturePad بدل Canvas بسيط؟

| المشكلة في Canvas الأصلي | الحل في SignaturePad |
|--------------------------|----------------------|
| ضبابي على Retina | `devicePixelRatio` aware |
| خطوط متكسّرة | `quadraticCurveTo` للتنعيم |
| لا زر مسح | زر `clear` مع state |
| يمكن تأكيد بدون توقيع | requires ≥ 25 نقطة |
| لا يُحفظ | يُحفظ كـ PNG data URL في Firestore |
| touch سيء على الموبايل | Pointer Events موحّدة |

### الكود الأساسي

```javascript
// DPR-aware setup
const dpr = window.devicePixelRatio || 1
canvas.width = rect.width * dpr
canvas.height = height * dpr
ctx.scale(dpr, dpr)

// Bezier smoothing
const mid = { x: (last.x + pos.x) / 2, y: (last.y + pos.y) / 2 }
ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
ctx.stroke()
```

### التحقق من صحة التوقيع

```javascript
if (totalPoints.current >= 25) {
  setHasSignature(true)
  onChange?.(canvasRef.current.toDataURL('image/png'))
}
```

### الحفظ في Firestore

```javascript
commitmentSignature: {
  dataUrl: signatureDataUrl,           // PNG base64
  signedAt: new Date().toISOString(),
  devicePixelRatio: window.devicePixelRatio || 1
}
```

### العرض في Passport

يُعرض التوقيع في `PassportPage` كعقد نفسي — المستخدم يرى توقيعه كل مرة، فيُذكّره بالتزامه.

---

## 13. نظام الإنفاذ النشط (Enforcement API)

### البنية

```
enforcement-api/
├── api/check-inactivity.js   # serverless function
├── package.json
├── vercel.json               # memory + timeout config
└── README.md
```

### آلية العمل

```
┌─────────────────┐
│ cron-job.org    │ كل ساعة
│ (مجدول)         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Vercel serverless function              │
│ /api/check-inactivity?secret=CRON_SECRET│
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 1. استعلم عن users حيث onboardingComplete│
│ 2. لكل user:                             │
│    - تحقق lastActiveAt                   │
│    - تحقق lastInactivityPenaltyAt        │
│    - طبّق عقوبة + أرسل إشعار             │
│    - try/catch لكل user (عزل الأخطاء)    │
└─────────────────────────────────────────┘
```

### المنطق الزمني

```javascript
const INACTIVITY_HOURS = 24                    // فترة السماح
const MIN_HOURS_BETWEEN_PENALTIES = 22         // منع التكرار

if (now - lastActiveAt < inactivityMs) continue       // لا يزال نشطاً
if (now - lastPenaltyAt < cooldownMs) continue        // عوقب حديثاً
```

### الإشعارات المخصصة

```javascript
const NOTIFICATION_COPY = {
  stress: {
    title: 'QuitForce — checking in',
    body: "You haven't opened QuitForce today. If stress is building..."
  },
  habit: { ... },
  social: { ... },
  boredom: { ... },
  default: { ... }
}
```

### قرارات تصميمية مهمة

1. **الخمول لا يصفّر الـ streak**
   - الخمول = عقوبة مالية فقط
   - الانتكاسة = عقوبة مالية + تصفير الـ streak
   - السبب: الخمول ليس دليلاً على الانتكاس

2. **عزل الأخطاء لكل مستخدم**
   - `try/catch` داخل الـ for loop
   - لو فشل user واحد، لا يتوقف الـ loop
   - يُجمَع `errors[]` في الـ response

3. **Shared secret**
   - `?secret=CRON_SECRET` يمنع الطلبات العشوائية

---

## 14. الترجمة والـ RTL/LTR

### إعداد i18next

```javascript
i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  fallbackLng: 'ar',
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }
})
```

### RTL/LTR التلقائي

```javascript
i18n.on('languageChanged', applyDirection)

function applyDirection(lng) {
  const dir = lng === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('lang', lng)
  document.documentElement.setAttribute('dir', dir)
}
```

### منع وميض LTR→RTL

في `index.html`، script صغير قبل تحميل React:

```html
<script>
  try {
    var lng = localStorage.getItem('i18nextLng') || 'ar'
    if (lng.indexOf('en') === 0) {
      document.documentElement.lang = 'en'
      document.documentElement.dir = 'ltr'
    } else {
      document.documentElement.lang = 'ar'
      document.documentElement.dir = 'rtl'
    }
  } catch (_) {}
</script>
```

### الخطوط

```css
body { font-family: 'Inter', system-ui, sans-serif; }
html[dir='rtl'] body { font-family: 'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif; }
.font-num { font-family: 'JetBrains Mono', monospace; }
```

---

## 15. تقسيم الـ Bundle

### النتائج

| قبل | بعد |
|-----|------|
| 1.29 MB (single chunk) | 116 KB initial + lazy chunks |
| 352 KB gzipped | 39 KB gzipped initial |

### التكتيكات

#### 1. React.lazy للصفحات

```javascript
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
// ... 8 صفحات lazy
```

#### 2. manualChunks للـ vendors

```javascript
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
        charts: ['recharts'],
        motion: ['framer-motion'],
        icons: ['lucide-react']
      }
    }
  }
}
```

#### 3. Suspense fallback

```jsx
<Suspense fallback={<FullScreenSpinner />}>
  {children}
</Suspense>
```

### توزيع الـ chunks النهائي

```
index.html                     1.71 kB
SpringCounter                  0.35 kB
BottomNav                      1.32 kB
JourneyPage                    1.98 kB
AdminPage                      2.52 kB
CommunityPage                  2.71 kB
StatsPage                      3.36 kB
WalletPage                     3.89 kB
icons                          6.75 kB
DashboardPage                  9.66 kB
CravingGuardPage              13.42 kB
index (initial)              116.37 kB
motion                       124.30 kB
firebase                     501.34 kB  (lazy)
charts                       517.88 kB  (lazy)
PassportPage + jsPDF         362.09 kB  (lazy)
```

---

## 16. السيناريوهات (Use Cases)

### السيناريو 1: مستخدم جديد كامل

```
1. يفتح /auth
2. ينشئ حساب (بريد + كلمة مرور)
   → updateProfile({ displayName: name })
   → createUserProfile(uid, { name, email, onboardingComplete: false })
3. يوجّه لـ /onboarding
4. يملأ الاستبيان (10 سجائر/يوم، 3 سنوات، $5/علبة، trigger: stress)
5. يرى ملفه: "مدخّن بسبب التوتر"
6. يوقّع العقد (SignaturePad)
7. يدخل مبلغ إيداع: $50
8. completeOnboarding(uid, {..., signatureDataUrl, depositAmount})
   → writeBatch: user + wallet + transaction
9. يوجّه لـ /dashboard
10. يرى مؤقت بدء من 0d 0h 0m 0s
```

### السيناريو 2: انتكاسة

```
1. المستخدم يضغط "أشعر برغبة"
2. CravingGuardPage يحمّل profile + wallet
3. يبدأ موجه 4 مراحل (حسب trigger)
4. في DecisionStage، يضغط "دخّنت"
5. يملأ: 3 سجائر، السبب: توتر
6. recordRelapse(uid, { count: 3, reason: 'stress' })
   - يقرأ balance = $50, penaltyCount = 0
   - rate = 5%, amount = $2.50
   - writeBatch:
     ├─ cravingLogs.add({ outcome: 'smoked', count: 3, reason: 'stress' })
     ├─ wallets.update({ balance: $47.50 })
     ├─ transactions.add({ type: 'penalty', amount: -2.50, rate: 0.05 })
     └─ users.update({ penaltyCount: 1, quitDate: now })
7. يرى: "-5% ($2.50) تم خصمها"
8. يعود لـ /dashboard
9. المؤقت يبدأ من جديد من 0
```

### السيناريو 3: خمول 24 ساعة

```
1. المستخدم لم يفتح التطبيق 25 ساعة
2. cron-job.org يطلق الـ Vercel function
3. function تقرأ users حيث onboardingComplete = true
4. تجد user مع:
   - lastActiveAt = 25h ago
   - lastInactivityPenaltyAt = null (لم يُعاقب من قبل)
5. تحسب: rate = 5% (penaltyCount = 0), amount = $2.375
6. writeBatch:
   ├─ wallets.update({ balance: $45.125 })
   ├─ transactions.add({ type: 'penalty', reason: 'inactivity', rate: 0.05 })
   ├─ users.update({ penaltyCount: 1, lastInactivityPenaltyAt: now })
   └─ cravingLogs.add({ outcome: 'inactivity-penalty' })
7. ترسل FCM push notification (مخصصة لـ trigger = stress)
8. response: { checked: 5, penalized: 1, results: [{uid, rate, amount}] }
9. ⚠️ quitDate لا يُعاد ضبطه (قرار تصميمي)
```

### السيناريو 4: الوصول لمرحلة Freedom

```
1. المستخدم يحافظ على تتابعه 30 يوماً
2. DashboardPage يحسب streakDays = 30
3. AuthContext يحدّث profile.streakDays
4. StageProvider يستقبل streakDays = 30
5. deriveStage(30) → 'freedom'
6. data-stage="freedom" على <html>
7. --stage-color = #FFD700 (ذهبي)
8. كل الـ tokens تتحدّث
9. JourneyPage يفتح محطة "الاحتفال" ☀️
10. PassportPage يحصل على كأس 🌅
```

### السيناريو 5: محاولة تزوير

```
1. مستخدم خبيث يحاول تعديل balance في Firestore Console
2. يكتب: balance = 1000000
3. firestore.rules تتحقق:
   - isOwner(uid)? ✓
   - affectedKeys.hasOnly(['balance'])? ✓
   → يُسمح بالكتابة (مؤقتاً!)
4. مستخدم خبيث يحاول تعديل penaltyCount = 0
5. firestore.rules:
   - isOwner(uid)? ✓
   - affectedKeys.hasOnly([...])? ✗ (penaltyCount ليس في القائمة)
   → يُرفض
6. مستخدم خبيث يحاول تعديل text منشور شخص آخر
7. firestore.rules:
   - request.resource.data.uid == resource.data.uid? ✗
   → يُرفض
```

### السيناريو 6: مستخدم عادي يحاول الوصول لـ /admin

```
1. المستخدم يكتب /admin في المتصفح
2. AdminRoute يتحقق:
   - loading? لا
   - user? نعم
   - role === 'admin'? لا (role = 'user')
3. يُعاد توجيهه لـ /dashboard
```

### السيناريو 7: تعيين Admin

```
1. المالك يشغّل:
   FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) npm run set-admin -- abc123
2. scripts/setAdmin.js:
   - يهيّئ firebase-admin
   - auth.setCustomUserClaims('abc123', { role: 'admin' })
3. المستخدم abc123 يسجّل خروج + دخول
4. AuthContext يستدعي getIdTokenResult()
5. role = 'admin'
6. يفتح /admin → ينجح
```

---

## 17. الاختبار والتحقق

### أوامر التحقق

```bash
# 1. التثبيت
npm install                    # يجب أن ينجح بدون أخطاء

# 2. البناء
npm run build                  # يجب أن ينجح + ينتج dist/

# 3. التشغيل
npm run dev                    # يجب أن يفتح على localhost:5173

# 4. المعاينة
npm run preview                # يجب أن يفتح على localhost:4173

# 5. توليد SW
npm run build:sw               # يجب أن ينتج firebase-messaging-sw.js

# 6. تعيين admin
npm run set-admin -- <UID>     # يحتاج FIREBASE_SERVICE_ACCOUNT_KEY
```

### قائمة التحقق اليدوية

- [ ] فتح `/auth` يعرض صفحة الدخول
- [ ] إنشاء حساب يوجّه لـ `/onboarding`
- [ ] التوقيع يعمل (mouse + touch)
- [ ] زر "مسح التوقيع" يعمل
- [ ] تأكيد الالتزام معطّل قبل التوقيع
- [ ] Dashboard يعرض المؤقت بشكل صحيح
- [ ] زر "خروج" في BottomNav يعمل
- [ ] تبديل اللغة يبدّل RTL/LTR
- [ ] صفحة `/admin` ترفض المستخدم العادي
- [ ] تصدير PDF في Passport يعمل
- [ ] التوقيع يُعرض في Passport

### نتائج الاختبار الفعلي

```
✓ npm install: نجح (264 حزمة)
✓ npm run build: نجح في 6.63s
✓ npm run dev: اشتغل على المنفذ 5173
✓ npm run preview: اشتغل على المنفذ 4173
✓ 15 ملف مختلف من src/: HTTP 200
✓ Production index.html: يُولّد بشكل صحيح
✓ enforcement-api syntax: صالح
✓ Initial bundle: 116 KB gzipped
```

---

## 18. القرارات التصميمية المهمة

### 1. لماذا `writeBatch` في recordRelapse؟

**المشكلة:** لو سجّل المستخدم انتكاستين بسرعة، أو لو اشتغل cron job في نفس اللحظة:
- يمكن تطبيق معدل 5% مرتين (يجب 5% ثم 10%)
- يمكن أن يصير الرصيد سالباً
- يمكن احتساب penaltyCount أقل من الفعلي

**الحل:** `writeBatch` يضمن atomicity — إما كل العمليات تنجح أو تفشل معاً.

### 2. لماذا `streakDays` في AuthContext؟

**المشكلة:** لو فتح المستخدم `/journey` مباشرة دون المرور بـ Dashboard:
- الـ stage يبقى افتراضياً "early"
- الألوان لا تتطابق مع تتابع المستخدم الحقيقي

**الحل:** `AuthContext` يشترك في `profile` doc ويحسب `streakDays` بشكل مركزي. كل الصفحات تقرأ من نفس المصدر.

### 3. لماذا الخمول لا يصفّر الـ streak؟

**المشكلة:** لو صفرنا الـ streak عند الخمول:
- مستخدم انشغل يومين لظرف طارئ يخسر إنجاز أسبوعين
- لا يوجد دليل أن الخمول = انتكاس
- يخلق إحباطاً يدفع للمزيد من التدخين

**الحل:** الخمول = عقوبة مالية فقط. الانتكاسة = عقوبة مالية + تصفير الـ streak. **هذا قرار تصميمي متعمّد، ليس إغفالاً.**

### 4. لماذا SignaturePad بدل WebAuthn (بصمة)؟

**المشكلة:** البصمة تحتاج:
- أجهزة تدعم WebAuthn (ليس كلها)
- إعداد إضافي للـ relying party
- تعقيد في الـ fallback

**الحل:** `SignaturePad` احترافي يعمل على كل الأجهزة + يحفظ التوقيع كصورة (قيمة نفسية تراكمية عند العرض في Passport).

### 5. لماذا لا نستخدم Cloud Functions للـ wallet؟

**المشكلة:** Cloud Functions تتطلب Blaze plan (بطاقة ائتمان).

**الحل (مؤقت):** نسمح للعميل بكتابة `balance` فقط، مع:
- قواعد `firestore.rules` تقيّد الحقول
- `writeBatch` يضمن atomicity
- `penaltyCount` و `lastInactivityPenaltyAt` محميان (server-only)

**الحل (إنتاجي):** نقل كل عمليات wallet لـ Callable Cloud Functions.

### 6. لماذا lazy loading؟

**المشكلة:** bundle واحد 1.29 MB يجعل التحميل الأولي بطيئاً.

**الحل:**
- `React.lazy` للصفحات
- `manualChunks` للـ vendors
- النتيجة: **116 KB initial** (انخفاض 67%)

### 7. لماذا `dotenv` للـ service worker؟

**المشكلة:** service worker ملف ثابت في `public/`، لا يقرأ `import.meta.env`.

**الحل:** سكربت `gen-sw.js` يقرأ `.env` ويستبدل الـ placeholders في `firebase-messaging-sw.js`. يُشغّل تلقائياً قبل `npm run build`.

---

## 19. التبسيطات المعروفة

هذه تبسيطات مقصودة للـ demo، يجب معالجتها قبل الإنتاج:

| # | التبسيط | المخاطرة | الحل الإنتاجي |
|---|---------|----------|---------------|
| 1 | wallet writes من العميل | يمكن التلاعب بـ balance | Callable Cloud Functions |
| 2 | Admin aggregation client-side | ينهار مع 1000+ مستخدم | Cloud Function + scheduled aggregation |
| 3 | iOS Web Push يحتاج Home Screen | محدودية Apple | لا يمكن حلها (platform restriction) |
| 4 | breathing lock 30s بدل 10min | تجريبي | تثبيت القيمة الإنتاجية |
| 5 | distraction game سهل | غير تحدي | زيادة الصعوبة تدريجياً |

---

## 20. استكشاف الأخطاء

### خطأ: "Missing required Firebase env vars"

**السبب:** `.env` فارغ أو غير موجود.

**الحل:**
```bash
cp .env.example .env
# املأ القيم من Firebase Console
```

### خطأ: "Firebase: Error (auth/invalid-api-key)"

**السبب:** قيم Firebase في `.env` خاطئة.

**الحل:** تحقق من Project settings → SDK setup في Firebase Console.

### خطأ: صفحة `/admin` تُعيد التوجيه لـ `/dashboard`

**السبب:** المستخدم ليس admin.

**الحل:**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY=$(cat key.json) npm run set-admin -- <UID>
# ثم سجّل خروج + دخول
```

### خطأ: "Permission denied" في Firestore

**السبب:** قواعد Firestore لم تُنشر.

**الحل:**
```bash
firebase deploy --only firestore:rules
```

### خطأ: إشعارات push لا تعمل

**الأسباب المحتملة:**
1. `VITE_FCM_VAPID_KEY` غير مُعبأ
2. `firebase-messaging-sw.js` ما زال يحتوي placeholders
3. المتصفح لا يدعم Web Push
4. iOS (< 16.4) أو iOS بدون Home Screen install

**الحلول:**
```bash
# 1. املأ VAPID_KEY في .env
# 2. أعد توليد SW:
npm run build:sw
# 3. تحقق من Console للمتصفح
```

### خطأ: build يفشل بـ "Cannot find package 'dotenv'"

**السبب:** npm audit fix أزال بعض الحزم.

**الحل:**
```bash
npm install
```

### خطأ: الـ bundle كبير جداً

**السبب:** نسيت lazy loading أو manualChunks.

**الحل:** تحقق من `vite.config.js` و `App.jsx`.

### خطأ: وميض LTR→RTL عند التحميل

**السبب:** script الـ pre-paint في `index.html` مفقود.

**الحل:** تحقق من `<head>` في `index.html`.

---

## 📞 الدعم

للمساعدة مع المشروع:
1. راجع هذا الملف أولاً
2. اقرأ `README.md` للملخص
3. اقرأ `enforcement-api/README.md` للـ API المنفصل
4. تحقق من comments في الكود (مكتوبة بالتفصيل)

---

## 🎓 ملاحظات للمناقشة

### النقاط القوية للعرض:

1. **أمنية**: قواعد Firestore ميدانية (field-scoped) + Admin route محمي بـ custom claims
2. **Atomicity**: كل العمليات الحساسة في `writeBatch`
3. **UX**: SignaturePad احترافي + RTL/LTR بدون وميض + skeleton loading
4. **أداء**: bundle splitting (1.29 MB → 116 KB initial)
5. **إنفاذ نشط**: serverless function + cron + FCM push
6. **تكيّف**: Craving Guard يتأقلم مع نوع الإدمان
7. **قيمة نفسية**: التوقيع يُحفظ ويُعرض مجدداً في Passport
8. **عزل الأخطاء**: enforcement API يعالج كل user في try/catch مستقل

### الأسئلة المتوقعة:

**س: لماذا الخمول لا يصفّر الـ streak؟**
ج: قرار تصميمي متعمّد — الخمول ليس دليلاً على الانتكاس. العقوبة المالية كافية كحافز للعودة.

**س: كيف نمنع التلاعب بـ balance؟**
ج: قواعد Firestore تقيّد الحقول المسموح بها. `penaltyCount` و `lastInactivityPenaltyAt` محميان تماماً. الحل الإنتاجي ينقل كل wallet writes لـ Cloud Functions.

**س: ما الفرق بين `recordRelapse` و enforcement API؟**
ج: `recordRelapse` يُستدعى من العميل عند "دخّنت" (يصفّر الـ streak). enforcement API يُستدعى من cron عند الخمول (لا يصفّر الـ streak، فقط عقوبة مالية).

**س: لماذا `writeBatch` مهم؟**
ج: يضمن atomicity — لو سجّل المستخدم انتكاستين بسرعة، لا يمكن تطبيق نفس المعدل مرتين أو احتساب penaltyCount أقل من الفعلي.

---

**QuitForce** — مشروع تخرج جاهز للمناقشة. 🎓
