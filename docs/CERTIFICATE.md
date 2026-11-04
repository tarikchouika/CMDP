# شهادة الملكية الرقمية — تطبيق CMDP لأندرويد

## الهوية الرقمية للشهادة

| الخاصية | القيمة |
| --- | --- |
| **المالك (الموقِّع)** | `CN=TARIK CHOUIKA, OU=CMDP Platform, O=TARIK CHOUIKA, L=Casablanca, C=MA` |
| **الاسم المستعار (Alias)** | `cmdp-platform` |
| **الخوارزمية** | RSA 4096 بت · توقيع SHA-384 |
| **تاريخ الإنشاء** | 2026-11-04 |
| **صلاحية الشهادة** | **30 سنة** — من 04/11/2026 إلى 27/10/2056 |
| **بصمة SHA-256** | `85:51:0A:9D:10:8F:EE:D5:62:2D:D8:C1:61:60:F7:52:E2:31:8A:06:29:88:92:4F:A7:82:FD:A4:A9:E1:53:FD` |

## الملفات

- `android/cmdp-release.keystore` — مخزن المفاتيح الموقِّع (JKS)
- `android/cmdp-release.keystore.properties` — كلمات السر والأسماء المستعارة

## البناء والتوقيع الآلي

سير العمل `.github/workflows/android-apk.yml` يبني APK موقَّعاً بهذه الشهادة **آلياً** مع كل دفع إلى `main` وعند التشغيل اليدوي، وينشره إلى إصدار GitHub ثابت الوسم `android-latest`.

**الرابط الدائم لآخر إصدار:**

```
https://github.com/tarikchouika/CMDP/releases/download/android-latest/CMDP.apk
```

التحقق من التوقيع محلياً:

```bash
apksigner verify --print-certs CMDP.apk
# يجب أن يظهر: Owner: CN=TARIK CHOUIKA, OU=CMDP Platform, ...
```

## ملاحظة أمنية

شهادة الملكية ملتزمة بالمستودع لضمان بناء آلي قابل لإعادة الإنتاج بتوقيع ثابت. إن حُوِّل المستودع إلى العمومي فيُستحسن بشدة نقل كلمات السر إلى **GitHub Secrets** (`CMDP_STORE_PASSWORD` و`CMDP_KEY_ALIAS` و`CMDP_KEY_PASSWORD`) — سير العمل يعتمدها تلقائياً إن وُجدت، مع إبقاء الشهادة موثقة لدى المالك حصراً.

> ⚠️ فقدان ملف `cmdp-release.keystore` يعني استحالة تحديث التطبيق لنفس الهوية — احتفظوا بنسخة احتياطية آمنة خارج المستودع.
