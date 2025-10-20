
I18n static strukturasi (taklif) - POS frontend uchun
Fayl joylashuvi:
  src/i18n/locales/{lang}/{namespace}.json
  - lang: uz, en, ru
  - namespaces: common, errors, ...

1) O'rnatish (React loyihada):
   npm install i18next react-i18next i18next-http-backend

2) src/i18n/i18n.js faylini loyihaga import qiling (masalan index.js yoki App.jsx):
   import './i18n/i18n';

3) public/locales papkasiga locales papkasini joylashtiring yoki serverdan yuklanishini sozlang.
   Biz hozir src/i18n/locales ichida namunaviy JSON yaratdik. Siz build jarayonida ularni public/locales ga ko'chirishingiz mumkin.

4) Komponentlarda foydalanish:
   import { useTranslation } from 'react-i18next';
   const { t, i18n } = useTranslation();
   <h1>{t('welcome')}</h1>

5) Tilni o'zgartirish:
   i18n.changeLanguage('en');

Qo'shimcha: agar siz Next.js ishlatayotgan bo'lsangiz, next-i18next yoki server-side resource loading kerak bo'ladi.
