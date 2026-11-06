#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# CMDP-049/QA — اختبار شامل للقاعدة المحلية بعد ربطها بالمنصة (v2 — Bearer)
# يغطي: الدخول بكل الأدوار، التسجيل العمومي (مستخدم/تعاونية بالمرفقات)،
# الحوارات الإدارية (مستخدم بصورة/وثائق، تعاونية بلوغو/وثائق)، التراتبية، المتجر
# ═══════════════════════════════════════════════════════════════════════════
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
declare -a FAILED

ck() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✓ $1";
  else FAIL=$((FAIL+1)); FAILED+=("$1 (متوقع=$2 فعلي=$3)"); echo "  ✗ $1 — متوقع $2 / فعلي $3"; fi
}
j() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null || echo PARSE_ERR; }
login() { curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"$2\"}"; }

PNG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
ATT='{"name":"photo.png","type":"image/png","size":95,"dataUrl":"'"$PNG"'"}'
ATT2='{"name":"doc.png","type":"image/png","size":95,"dataUrl":"'"$PNG"'"}'


echo "═══ 0) تنظيف مسبق لبيانات QA القديمة ═══"
python3 - <<'PYEOF'
import urllib.request, json
BASE="http://localhost:3000"
def req(path, method="GET", body=None, token=None):
    r = urllib.request.Request(BASE+path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Content-Type":"application/json", **({"Authorization":"Bearer "+token} if token else {})})
    return json.loads(urllib.request.urlopen(r).read())
try:
    tok = req("/api/auth/login","POST",{"username":"tarik","password":"25CS3SURLK&DKePP"})["token"]
    users = req("/api/users", token=tok)
    for u in users:
        if u["username"].startswith("qa."):
            req(f"/api/users/{u['id']}","DELETE",token=tok)
    for c in req("/api/cooperatives", token=tok):
        if "QA" in c["name"]:
            req(f"/api/cooperatives/{c['id']}","DELETE",token=tok)
    for p_ in req("/api/products", token=tok):
        if "QA" in p_.get("name",""):
            req(f"/api/products/{p_['id']}","DELETE",token=tok)
    for o in req("/api/orders", token=tok):
        if "QA" in str(o.get("customerName","")):
            req(f"/api/orders/{o['id']}","DELETE",token=tok)
    print("  ✓ لا بقايا QA")
except Exception as e:
    print(f"  ⚠ تنظيف مسبق: {e}")
PYEOF

echo "═══ 1) الدخول بكل الحسابات (قاعدة حقيقية) ═══"
for u in tarik test.president test.manager test.member test.contractor; do
  case $u in
    tarik) P="25CS3SURLK&DKePP";; test.president) P="yWD@yYB9yPi%qQZn";;
    test.manager) P="2eeMgKQgutMSzdf@";; test.member) P="khQriSxuSsFYGzgs";;
    test.contractor) P="#iMRfL#LHCEmAZZr";;
  esac
  R=$(login "$u" "$P")
  ck "دخول $u" "$u" "$(echo "$R" | j "d['user']['username']")"
done
R=$(login tarik "wrong-password")
ck "رفض كلمة مرور خاطئة" "401" "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"tarik","password":"wrong"}')"

TARIK=$(login tarik "25CS3SURLK&DKePP" | j "d['token']")
MGR=$(login test.manager "2eeMgKQgutMSzdf@" | j "d['token']")
PRES=$(login test.president "yWD@yYB9yPi%qQZn" | j "d['token']")
AH() { echo "Authorization: Bearer $1"; }

echo "═══ 2) قوائم الداشبورد (مالك) ═══"
for ep in users cooperatives members stats; do
  ck "GET /api/$ep" "200" "$(curl -s -o /dev/null -w "%{http_code}" -H "$(AH "$TARIK")" "$BASE/api/$ep")"
done

echo "═══ 3) حوار إضافة مستخدم: صورة + وثائق هوية ═══"
R=$(curl -s -X POST "$BASE/api/users" -H "$(AH "$TARIK")" -H 'Content-Type: application/json' -d '{
  "username":"qa.user1","password":"QaTest123456","fullName":"مستخدم اختبار QA",
  "phone":"0600112233","email":"qa1@cmdp.ma","cin":"QA123456",
  "role":"USER","accountType":"MEMBER","cooperativeId":1,
  "photo":'"$ATT"',"idDocuments":['"$ATT"','"$ATT2"']}')
ck "إنشاء qa.user1" "qa.user1" "$(echo "$R" | j "d['username']")"
UID1=$(echo "$R" | j "d['id']")
ck "تخزين صورة المستخدم" "True" "$(echo "$R" | j "d['photo'] is not None")"
ck "تخزين وثيقتي الهوية" "2" "$(echo "$R" | j "len(json.loads(d['idDocuments']))")"
R=$(curl -s -H "$(AH "$TARIK")" "$BASE/api/users")
ck "القائمة تعيد photo" "True" "$(echo "$R" | j "any(u.get('photo') for u in d)")"
ck "القائمة تعيد idDocuments" "True" "$(echo "$R" | j "any(u.get('idDocuments') for u in d)")"

echo "═══ 4) تحرير المستخدم: تصفير الوثائق (إرسال []) ═══"
R=$(curl -s -X PUT "$BASE/api/users/$UID1" -H "$(AH "$TARIK")" -H 'Content-Type: application/json' -d '{"idDocuments":[]}')
ck "تصفير idDocuments" "0" "$(echo "$R" | j "len(json.loads(d['idDocuments']))")"

echo "═══ 5) التسجيل العمومي: مستخدم بمرفقات إلزامية ═══"
CODE=$(curl -s -o /tmp/r5.json -w "%{http_code}" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' -d '{
  "intent":"MEMBER","username":"qa.public","password":"QaPublic123456","fullName":"زائر مسجل QA",
  "phone":"0611223344","cin":"PB123456","cooperativeId":1,
  "photo":'"$ATT"',"idDocuments":['"$ATT"'],"motivation":"اختبار التسجيل العمومي"}')
ck "تسجيل qa.public (201)" "201" "$CODE"
R=$(curl -s -H "$(AH "$TARIK")" "$BASE/api/users")
ck "مرفقات qa.public خُزِّنت" "True" "$(echo "$R" | j "[u for u in d if u['username']=='qa.public'][0]['photo'] is not None")"

echo "═══ 6) التسجيل العمومي: تعاونية بوثائق قانونية ═══"
CODE=$(curl -s -o /tmp/r6.json -w "%{http_code}" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' -d '{
  "intent":"NEW_COOP","username":"qa.president","password":"QaCoop123456","fullName":"رئيس تعاونية QA",
  "phone":"0622334455","cin":"PC123456",
  "photo":'"$ATT"',"idDocuments":['"$ATT"'],"legalDocuments":['"$ATT"','"$ATT2"'],
  "cooperative":{
    "name":"تعاونية QA للفحص الآلي","sector":"الفلاحة والمنتجات المجالية",
    "region":"سوس-ماسة","province":"تارودانت","commune":"أولاد برحيل",
    "phone":"0622334455","foundingDate":"2026-01-01T00:00:00.000Z"}}')
ck "تسجيل تعاونية QA (201)" "201" "$CODE"
R=$(curl -s -H "$(AH "$TARIK")" "$BASE/api/cooperatives")
ck "حالتها PENDING" "PENDING" "$(echo "$R" | j "[c for c in d if 'QA' in c['name']][0]['approvalStatus']")"
ck "الوثائق القانونية مخزَّنة" "2" "$(echo "$R" | j "len(json.loads([c for c in d if 'QA' in c['name']][0]['legalDocuments']))")"

echo "═══ 7) حوار إضافة تعاونية: لوغو + وثائق ═══"
R=$(curl -s -X POST "$BASE/api/cooperatives" -H "$(AH "$TARIK")" -H 'Content-Type: application/json' -d '{
  "name":"تعاونية داشبورد QA","registrationNumber":"QA-DB-001","sector":"الصناعة التقليدية",
  "region":"مراكش-آسفي","province":"أسني","commune":"أسني","presidentName":"رئيس داشبورد",
  "phone":"0633445566","foundingDate":"2026-02-01T00:00:00.000Z",
  "logo":'"$ATT"',"legalDocuments":['"$ATT"'],"status":"ACTIVE","notes":"إنشاء من حوار الداشبورد"}')
ck "إنشاء تعاونية الداشبورد" "APPROVED" "$(echo "$R" | j "d['approvalStatus']")"
ck "اللوغو مخزَّن" "True" "$(echo "$R" | j "d['logo'] is not None")"
COOPD=$(echo "$R" | j "d['id']")
R=$(curl -s -X PUT "$BASE/api/cooperatives/$COOPD" -H "$(AH "$TARIK")" -H 'Content-Type: application/json' -d '{"logo":null}')
ck "تحديث PUT: حذف اللوغو" "None" "$(echo "$R" | j "d['logo']")"

echo "═══ 8) التراتبية: المسير لا يمسّ الرئيس ═══"
R=$(curl -s -H "$(AH "$PRES")" "$BASE/api/users")
PRESID=$(echo "$R" | j "[u['id'] for u in d if u['username']=='test.president'][0]")
ck "المسير يوقف الرئيس → 403" "403" "$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/users/$PRESID" -H "$(AH "$MGR")" -H 'Content-Type: application/json' -d '{"status":"SUSPENDED"}')"
ck "المسير يحذف الرئيس → 403" "403" "$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/users/$PRESID" -H "$(AH "$MGR")")"
R=$(curl -s -H "$(AH "$TARIK")" "$BASE/api/users")
ck "الرئيس ما زال نشطاً" "ACTIVE" "$(echo "$R" | j "next(u['status'] for u in d if u['id']==$PRESID)" 2>/dev/null || echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((u['status'] for u in d if u['id']==$PRESID),'NOTFOUND'))")"
R=$(curl -s -H "$(AH "$MGR")" "$BASE/api/users")
ck "المسير لا يرى زر إدارة الرئيس (canManageUser=false محاكاة)" "False" "$(echo "$R" | j "any(u['username']=='tarik' for u in d)")"

echo "═══ 9) المتجر: منتجات وطلبات وإحصائيات ═══"
R=$(curl -s -X POST "$BASE/api/products" -H "$(AH "$PRES")" -H 'Content-Type: application/json' -d '{
  "name":"زيت أركان QA","description":"منتج فحص آلي","price":99.5,"unit":"لتر",
  "stock":10,"category":"زيوت","cooperativeId":1,"image":'"$ATT"'}')
ck "إنشاء منتج (رئيس)" "زيت أركان QA" "$(echo "$R" | j "d['name']")"
PID=$(echo "$R" | j "d['id']")
R=$(curl -s -X POST "$BASE/api/orders" -H 'Content-Type: application/json' -d '{
  "productId":'"$PID"',"quantity":2,"customerName":"عميل QA","phone":"0644556677",
  "city":"أكادير","note":"طلب فحص"}')
ck "إنشاء طلب (زائر بلا توكن)" "NEW" "$(echo "$R" | j "d['status']")"
OID=$(echo "$R" | j "d['id']")
R=$(curl -s -H "$(AH "$PRES")" "$BASE/api/store/stats")
ck "إحصائيات المتجر (رئيس)" "True" "$(echo "$R" | j "'revenue' in d or 'totalRevenue' in d or len(d)>0")"
R=$(curl -s -X PATCH "$BASE/api/orders/$OID" -H "$(AH "$PRES")" -H 'Content-Type: application/json' -d '{"status":"CONTACTED"}')
ck "معالجة الطلب (تم التواصل)" "CONTACTED" "$(echo "$R" | j "d['status']")"
R=$(curl -s -X PATCH "$BASE/api/orders/$OID" -H "$(AH "$PRES")" -H 'Content-Type: application/json' -d '{"status":"DONE"}')
ck "إتمام الطلب" "DONE" "$(echo "$R" | j "d['status']")"

echo "═══ 10) حماية الجلسات ═══"
ck "قائمة المستخدمين بلا توكن → 401" "401" "$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/users")"
ck "المسير يقرأ التعاونيات" "200" "$(curl -s -o /dev/null -w "%{http_code}" -H "$(AH "$MGR")" "$BASE/api/cooperatives")"
ck "حذف تعاونية الداشبورد (تنظيف)" "200" "$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/cooperatives/$COOPD" -H "$(AH "$TARIK")")"

echo "═══ 11) تنظيف بيانات QA ═══"
python3 - <<PYEOF
import urllib.request, json
BASE="http://localhost:3000"
def req(path, method="GET", body=None, token=None):
    r = urllib.request.Request(BASE+path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Content-Type":"application/json", **({"Authorization":"Bearer "+token} if token else {})})
    return json.loads(urllib.request.urlopen(r).read())
tok = req("/api/auth/login","POST",{"username":"tarik","password":"25CS3SURLK&DKePP"})["token"]
users = req("/api/users", token=tok)
n=0
for u in users:
    if u["username"].startswith("qa."):
        req(f"/api/users/{u['id']}","DELETE",token=tok); n+=1
coops = req("/api/cooperatives", token=tok)
for c in coops:
    if "QA" in c["name"]:
        req(f"/api/cooperatives/{c['id']}","DELETE",token=tok); n+=1
orders = req("/api/orders", token=tok)
for o in (orders if isinstance(orders,list) else orders.get("data",[])):
    if "QA" in str(o.get("customerName","")):
        req(f"/api/orders/{o['id']}","DELETE",token=tok); n+=1
prods = req("/api/products", token=tok)
for p in (prods if isinstance(prods,list) else prods.get("data",[])):
    if "QA" in p.get("name",""):
        req(f"/api/products/{p['id']}","DELETE",token=tok); n+=1
print(f"  ✓ نُظِّف {n} سجلاً")
PYEOF

echo
echo "════════════════════════════════════════"
echo "النتيجة: ✓ $PASS نجح | ✗ $FAIL فشل"
if [ ${#FAILED[@]:-0} -gt 0 ]; then printf ' - %s\n' "${FAILED[@]}"; fi
echo "════════════════════════════════════════"
[ $FAIL -eq 0 ]
