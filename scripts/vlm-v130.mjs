import ZAI from 'z-ai-web-dev-sdk';
import fs from 'node:fs';

async function main() {
  const zai = await ZAI.create();
  const files = [
    '/tmp/shot-login.png',
    '/tmp/shot-store-fr.png',
    '/tmp/shot-store-mobile-fr.png',
    '/tmp/shot-manager-users.png',
  ];
  const content = [{
    type: 'text',
    text: `أنت مراجع جودة واجهات. افحص هذه اللقطات الأربع من منصة CMDP بالترتيب وأجب باختصار عن كل لقطة:
1) صفحة الدخول (عربية): هل توجد أي بيانات دخول تجريبية أو كلمة مرور ظاهرة مثل cmdp2026؟ هل البطاقة أنيقة؟
2) إدارة المتجر بالفرنسية (كمبيوتر): هل التخطيط سليم بلا فيضان أو تداخل؟ التبويبات والأزرار واضحة؟
3) إدارة المتجر على هاتف 390px: هل متجاوب بلا فيضان أفقي؟ مقروء؟
4) وحدة المستخدمين كمشرف (فرنسية): هل تظهر شارة Compte protégé على بعض الصفوف؟ الجدول سليم؟
أجب بإيجاز لكل صورة.`,
  }];
  for (const f of files) {
    const b64 = fs.readFileSync(f).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }
  const res = await zai.chat.completions.createVision({ messages: [{ role: 'user', content }] });
  console.log(res.choices[0]?.message?.content);
}
main().catch(e => { console.error(e.message); process.exit(1); });
