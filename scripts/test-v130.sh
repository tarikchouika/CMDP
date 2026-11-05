#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# CMDP — اختبار شامل للإصدار 1.3.0 (التراتبية + المتجر + الحسابات الحقيقية)
# ═══════════════════════════════════════════════════════════════════════════
set -u
BASE="${BASE:-http://localhost:3000}"
# الاعتماديات من متغيرات البيئة (لا تُكتب في الملف أبداً):
#   PRES_PASS / MGR_PASS / OWNER_PASS / MEMBER_PASS
PRES_PASS="${PRES_PASS:?حدد PRES_PASS وكلمة مرور رئيس الاختبار}"
MGR_PASS="${MGR_PASS:?حدد MGR_PASS وكلمة مرور المسير}"
OWNER_PASS="${OWNER_PASS:?حدد OWNER_PASS وكلمة مرور المالك}"
MEMBER_PASS="${MEMBER_PASS:?حدد MEMBER_PASS وكلمة مرور العضو}"
PASS=0; FAIL=0

check() { # العنوان، المتوقع، الفعلي
  if [ "$2" = "$3" ]; then echo "✓ $1 ($3)"; PASS=$((PASS+1));
  else echo "✗ $1 — المتوقع $2 والفعلي $3"; FAIL=$((FAIL+1)); fi
}

jqget() { python3 -c "import json,sys; d=json.load(sys.stdin); print(d$1)" 2>/dev/null; }

echo "═══ 1) تسجيل الدخول بالحسابات الحقيقية ═══"
TOK_PRES=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d "{\"username\":\"test.president\",\"password\":\"$PRES_PASS\"}" | jqget "['token']")
TOK_MGR=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d "{\"username\":\"test.manager\",\"password\":\"$MGR_PASS\"}" | jqget "['token']")
TOK_OWNER=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d "{\"username\":\"tarik\",\"password\":\"$OWNER_PASS\"}" | jqget "['token']")
[ -n "$TOK_PRES" ] && { echo "✓ دخول الرئيس"; PASS=$((PASS+1)); } || { echo "✗ فشل دخول الرئيس"; FAIL=$((FAIL+1)); }
[ -n "$TOK_MGR" ] && { echo "✓ دخول المسير"; PASS=$((PASS+1)); } || { echo "✗ فشل دخول المسير"; FAIL=$((FAIL+1)); }
[ -n "$TOK_OWNER" ] && { echo "✓ دخول المالك"; PASS=$((PASS+1)); } || { echo "✗ فشل دخول المالك"; FAIL=$((FAIL+1)); }

PRES_ID=$(curl -s $BASE/api/users -H "Authorization: Bearer $TOK_PRES" | python3 -c "import json,sys; us=json.load(sys.stdin); print([u['id'] for u in us if u['username']=='test.president'][0])")
MGR_ID=$(curl -s $BASE/api/users -H "Authorization: Bearer $TOK_PRES" | python3 -c "import json,sys; us=json.load(sys.stdin); print([u['id'] for u in us if u['username']=='test.manager'][0])")
echo "— معرف الرئيس: $PRES_ID | معرف المسير: $MGR_ID"

echo ""
echo "═══ 2) الخلل المُبلَّغ: المسير يحاول إيقاف/حذف حساب الرئيس ═══"
CODE=$(curl -s -o /tmp/r1.json -w "%{http_code}" -X PUT $BASE/api/users/$PRES_ID \
  -H "Authorization: Bearer $TOK_MGR" -H "Content-Type: application/json" -d '{"status":"SUSPENDED"}')
check "المسير → إيقاف الرئيس (يجب أن يُرفض)" 403 "$CODE"
cat /tmp/r1.json | jqget "['error']" | sed 's/^/   الرد: /'

CODE=$(curl -s -o /tmp/r2.json -w "%{http_code}" -X DELETE $BASE/api/users/$PRES_ID \
  -H "Authorization: Bearer $TOK_MGR")
check "المسير → حذف الرئيس (يجب أن يُرفض)" 403 "$CODE"

CODE=$(curl -s -o /tmp/r3.json -w "%{http_code}" -X PUT $BASE/api/users/$PRES_ID \
  -H "Authorization: Bearer $TOK_MGR" -H "Content-Type: application/json" -d '{"password":"hacked123"}')
check "المسير → تصفير كلمة مرور الرئيس (يجب أن يُرفض)" 403 "$CODE"

CODE=$(curl -s -o /tmp/r4.json -w "%{http_code}" -X PUT $BASE/api/users/$PRES_ID \
  -H "Authorization: Bearer $TOK_MGR" -H "Content-Type: application/json" -d '{"role":"USER","accountType":"MEMBER"}')
check "المسير → تخفيض دور الرئيس (يجب أن يُرفض)" 403 "$CODE"

echo ""
echo "═══ 3) الحماية الذاتية والتراتبية الصحيحة ═══"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $BASE/api/users/$MGR_ID \
  -H "Authorization: Bearer $TOK_MGR" -H "Content-Type: application/json" -d '{"status":"SUSPENDED"}')
check "المسير → إيقاف حسابه الشخصي (مرفوض)" 403 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $BASE/api/users/$MGR_ID \
  -H "Authorization: Bearer $TOK_PRES" -H "Content-Type: application/json" -d '{"fullName":"حساب اختبار — عضو مسير (محدّث)"}')
check "الرئيس → تعديل بيانات المسير (مسموح)" 200 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/users \
  -H "Authorization: Bearer $TOK_MGR" -H "Content-Type: application/json" \
  -d '{"username":"escalate.test","password":"123456","fullName":"اختبار تصعيد","role":"COADMIN","accountType":"PRESIDENT","cooperativeId":1}')
check "المسير → إنشاء حساب رئيس جديد (تصعيد، مرفوض)" 403 "$CODE"

echo ""
echo "═══ 4) وحدة المتجر: المنتجات والطلبات ═══"
CODE=$(curl -s -o /tmp/p1.json -w "%{http_code}" -X POST $BASE/api/products \
  -H "Authorization: Bearer $TOK_PRES" -H "Content-Type: application/json" \
  -d '{"cooperativeId":1,"name":"زيت أركان معصور على البارد","category":"منتجات غذائية","price":180,"unit":"قنينة 250 مل","description":"منتج اختبار","featured":true}')
check "الرئيس → إضافة منتج" 201 "$CODE"
PROD_ID=$(cat /tmp/p1.json | jqget "['id']")

CODE=$(curl -s -o /tmp/o1.json -w "%{http_code}" -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"productId\":$PROD_ID,\"quantity\":3,\"customerName\":\"زبون عمومي\",\"phone\":\"0660000000\",\"city\":\"أكادير\",\"note\":\"طلب من المتجر العمومي\"}")
check "عمومي → طلب شراء من المتجر" 201 "$CODE"
ORDER_ID=$(cat /tmp/o1.json | jqget "['id']")

CODE=$(curl -s -o /tmp/o2.json -w "%{http_code}" -X POST $BASE/api/orders \
  -H "Authorization: Bearer $TOK_PRES" -H "Content-Type: application/json" \
  -d "{\"productId\":$PROD_ID,\"quantity\":2,\"customerName\":\"زبون هاتفي\",\"phone\":\"0661111111\"}")
check "الرئيس → تسجيل طلب يدوي" 201 "$CODE"
ORDER2_ID=$(cat /tmp/o2.json | jqget "['id']")

CODE=$(curl -s -o /tmp/ordlist.json -w "%{http_code}" $BASE/api/orders -H "Authorization: Bearer $TOK_MGR")
check "المسير → قائمة طلبات تعاونيته" 200 "$CODE"
N_ORDERS=$(cat /tmp/ordlist.json | jqget ".__len__()")
check "عدد الطلبات الظاهرة للمسير" 2 "$N_ORDERS"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $TOK_MGR" -H "Content-Type: application/json" -d '{"status":"CONTACTED"}')
check "المسير → معالجة الطلب (تم التواصل)" 200 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/api/orders/$ORDER2_ID \
  -H "Authorization: Bearer $TOK_PRES" -H "Content-Type: application/json" -d '{"status":"DONE"}')
check "الرئيس → إتمام الطلب" 200 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH $BASE/api/orders/$ORDER_ID \
  -H "Content-Type: application/json" -d '{"status":"DONE"}')
check "زائر بلا توكن → معالجة طلب (مرفوض)" 401 "$CODE"

echo ""
echo "═══ 5) الإحصائيات والتقارير ═══"
CODE=$(curl -s -o /tmp/stats.json -w "%{http_code}" "$BASE/api/store/stats?days=30" -H "Authorization: Bearer $TOK_PRES")
check "الرئيس → إحصائيات المتجر" 200 "$CODE"
TOT=$(cat /tmp/stats.json | jqget "['totals']['totalOrders']")
DONE=$(cat /tmp/stats.json | jqget "['totals']['byStatus']['DONE']")
REV=$(cat /tmp/stats.json | jqget "['totals']['doneRevenue']")
check "إجمالي الطلبات في الإحصائيات" 2 "$TOT"
check "الطلبات المكتملة" 1 "$DONE"
check "الإيراد المحقق (180×2)" 360 "$REV"

echo ""
echo "═══ 6) نطاق التعاونية والعضو ═══"
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/orders -H "Authorization: Bearer $TOK_OWNER")
check "المالك → كل الطلبات (نطاق المنصة)" 200 "$CODE"

TOK_MEM=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d "{\"username\":\"test.member\",\"password\":\"$MEMBER_PASS\"}" | jqget "['token']")
CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/orders -H "Authorization: Bearer $TOK_MEM")
check "العضو → طلبات المتجر (مرفوض — ليست من صلاحياته)" 403 "$CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/products \
  -H "Authorization: Bearer $TOK_MEM" -H "Content-Type: application/json" \
  -d '{"cooperativeId":1,"name":"x","category":"أخرى","price":1}')
check "العضو → إضافة منتج (مرفوض)" 403 "$CODE"

echo ""
echo "════════════════════════════════════════════"
echo "النتيجة: ✓ $PASS ناجح | ✗ $FAIL فاشل"
[ $FAIL -eq 0 ] && echo "جميع الاختبارات ناجحة ✓✓" || echo "يوجد إخفاقات تتطلب المراجعة!"
