# 🤴 The King AI - مساعدك الذكي العربي

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)

**تطبيق ذكاء اصطناعي عربي يعمل بدون إنترنت 🚀**

## ✨ المميزات الرئيسية

- 🤖 **دعم عدة محركات ذكاء اصطناعي**: Claude (Anthropic) و Gemini (Google)
- 🌐 **PWA كامل**: قابل للتثبيت على أي جهاز والعمل بدون إنترنت
- 💾 **تخزين محلي ذكي**: استخدام IndexedDB و LocalStorage
- 🔍 **بحث ويب مدمج**: البحث عن معلومات حديثة عند الاتصال بالإنترنت
- 🎤 **دعم الكلام**: تحويل النص إلى كلام والعكس (Web Speech API)
- 📚 **نظام تعليم ذاتي**: يتعلم من تفاعلاتك وتصحيحاتك
- 🎨 **واجهة عصرية**: تصميم جميل مع دعم المظاهر المختلفة
- 📱 **متوافق تماماً مع الجوال**: تصميم responsive وتجربة Native-like
- 🔔 **نظام تنبيهات ذكي**: تذكيرات مجدولة مع إشعارات
- 💡 **ميزات متقدمة**: تصحيح تلقائي، تجميع الأسئلة المشابهة، معالجة NLP

## 📦 المتطلبات

- Node.js >= 16
- npm أو yarn

## 🚀 البدء السريع

### 1. استنساخ المستودع

```bash
git clone https://github.com/yourusername/king-ai.git
cd king-ai
```

### 2. تثبيت المتطلبات

```bash
npm install
```

### 3. تشغيل بيئة التطوير

```bash
npm run dev
```

ثم افتح `http://localhost:5173` في متصفحك

## 🔨 البناء للإنتاج

```bash
npm run build
```

سيتم إنشاء المجلد `dist/` الذي يمكنك نشره على أي خادم ويب

### معاينة الإصدار الإنتاجي محلياً

```bash
npm run preview
```

## 🛠️ الإعدادات

### إعدادات البيئة

أنشئ ملف `.env.local` (اختياري):

```env
VITE_API_TIMEOUT=20000
```

### المفاتيح المطلوبة

للاستفادة من الذكاء الاصطناعي المتقدم، ستحتاج إلى:

1. **مفتاح Claude API** (اختياري):
   - احصل عليه من [console.anthropic.com](https://console.anthropic.com)
   - أضفه من الإعدادات داخل التطبيق

2. **مفتاح Gemini API** (اختياري):
   - احصل عليه من [ai.google.dev](https://ai.google.dev)
   - أضفه من الإعدادات داخل التطبيق

3. **مفتاح Brave Search** (اختياري):
   - للبحث المتقدم على الويب

> **ملاحظة**: التطبيق يعمل بدون هذه المفاتيح، لكن الميزات المتقدمة ستكون محدودة

## 📁 هيكل المشروع

```
king-ai/
├── public/                 # الملفات الثابتة
│   ├── crown.svg          # شعار التطبيق
│   ├── crown-192.png      # أيقونة 192x192
│   └── crown-512.png      # أيقونة 512x512
│
├── src/
│   ├── components/        # مكونات React
│   │   ├── Header.jsx
│   │   ├── MessageList.jsx
│   │   ├── InputBar.jsx
│   │   ├── BottomNav.jsx
│   │   ├── SettingsScreen.jsx
│   │   ├── Screens.jsx
│   │   └── Toast.jsx
│   │
│   ├── engine/            # محرك المعالجة الأساسي
│   │   ├── ai.js          # تكامل APIs الذكاء الاصطناعي
│   │   ├── knowledge.js   # نظام إدارة المعرفة
│   │   ├── nlp.js         # معالجة اللغة الطبيعية
│   │   ├── search.js      # البحث والفهرسة
│   │   ├── speech.js      # تحويل الكلام والنص
│   │   ├── storage.js     # إدارة التخزين
│   │   └── seed.js        # بيانات البذرة الأولية
│   │
│   ├── hooks/             # React Hooks مخصصة
│   │   └── useChat.js     # خطاف إدارة المحادثة
│   │
│   ├── context/           # Context API
│   │   └── AppContext.jsx # Context الرئيسي
│   │
│   ├── styles/            # أوراق الأنماط
│   │   └── app.css
│   │
│   ├── App.jsx            # المكون الرئيسي
│   └── main.jsx           # نقطة الدخول
│
├── index.html             # HTML الرئيسي
├── vite.config.js         # إعدادات Vite
├── package.json           # الحزم والمتطلبات
└── README.md              # هذا الملف
```

## 🎯 كيفية الاستخدام

### الشاشة الرئيسية (المحادثة)

- اكتب سؤالك في حقل الإدخال
- اضغط Enter أو زر الإرسال
- اقرأ الرد من الملك

### شاشة الذاكرة

- عرض جميع ما تعلمه التطبيق عنك
- حذف أو تعديل السجلات

### شاشة المراجعة

- مراجعة سجل المحادثات السابقة

### شاشة التذكيرات

- إضافة تذكيرات مجدولة
- إدارة التنبيهات

### الإعدادات

- تخصيص سلوك التطبيق
- إدارة المفاتيح والإعدادات المتقدمة

## 🔐 الأمان والخصوصية

- **جميع البيانات محلية**: يتم تخزين كل شيء في جهازك
- **لا توجد خوادم وسيطة**: الاتصال مباشر بـ APIs المتاح
- **قابل للقفل**: يمكن حماية التطبيق برقم PIN

## 🌍 التكامل مع الويب

عند الاتصال بالإنترنت، يستطيع التطبيق:

- البحث على الويب عبر Brave Search أو DuckDuckGo
- الحصول على أحدث المعلومات
- مساعدة الذكاء الاصطناعي بسياق إضافي

## 📊 الأداء

- **حجم التطبيق**: ~150KB (مضغوط)
- **سرعة التحميل**: <2 ثانية على الشبكات العادية
- **استهلاك الذاكرة**: ~30MB أثناء الاستخدام الطبيعي
- **دعم السحب والإسقاط**: لرفع الصور تلقائياً

## 🤝 المساهمة

نرحب بمساهماتك! 

1. Fork المستودع
2. أنشئ فرع جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للفرع (`git push origin feature/amazing-feature`)
5. افتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE)

## 📞 التواصل والدعم

- **تقارير الأخطاء**: [GitHub Issues](https://github.com/yourusername/king-ai/issues)
- **النقاشات**: [GitHub Discussions](https://github.com/yourusername/king-ai/discussions)

## 🙏 شكر خاص

- React و Vite لتوفير أدوات تطوير رائعة
- Font Awesome للأيقونات
- CDN Cloudflare للخدمات السريعة
- Anthropic و Google لـ APIs الذكاء الاصطناعي

## 📚 الموارد

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**صُنع بـ ❤️ من قبل مجتمع يحب الذكاء الاصطناعي والعربية**
