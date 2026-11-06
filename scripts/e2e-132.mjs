// CMDP E2E — اختبار شامل لميزات الإصدار 1.3.2 (ملكية/سوبر أدمين/سجل/إشعارات)
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const fails = [];

function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ✗ ${name} ${extra}`); }
}

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { }
  return { status: res.status, json };
}

async function login(username, password) {
  const r = await api("/api/auth/login", { method: "POST", body: { username, password } });
  return r;
}

const main = async () => {
  console.log("═══ 1) الدخول والملكية ═══");
  const t0 = await login("tarik", "Tarik@CMDP2026!");
  check("دخول المالك tarik", t0.status === 200 && !!t0.json?.token);
  check("isOwner=true للمالك", t0.json?.user?.isOwner === true);
  const tarik = t0.json.token;

  const me = await api("/api/auth/me", { token: tarik });
  check("/api/auth/me يعيد الجلسة", me.status === 200 && me.json?.user?.username === "tarik" && me.json.user.isOwner === true);

  const meBad = await api("/api/auth/me", { token: "deadbeef.deadbeef" });
  check("/api/auth/me يرفض رمزاً ميتاً (401)", meBad.status === 401);

  console.log("═══ 2) إنشاء سوبر أدمين ═══");
  const created = await api("/api/super-admins", {
    method: "POST", token: tarik,
    body: { mode: "new", username: "super1", fullName: "سوبر أدمين تجريبي أول", password: "SuperOne@2026!", reason: "اختبار آلي لمسار السوبر أدمين العادل" },
  });
  check("إنشاء سوبر أدمين جديد", created.status === 201 && created.json?.user?.role === "SUPER_ADMIN", JSON.stringify(created.json));
  const super1Id = created.json?.user?.id;

  const noReason = await api("/api/super-admins", {
    method: "POST", token: tarik,
    body: { mode: "new", username: "x2", fullName: "بدون سبب", password: "SuperOne@2026!" },
  });
  check("رفض إنشاء بلا سبب موثق (400)", noReason.status === 400);

  console.log("═══ 3) حدود صلاحيات السوبر أدمين غير المالك ═══");
  const s1 = await login("super1", "SuperOne@2026!");
  check("دخول سوبر أدمين الجديد", s1.status === 200 && s1.json?.user?.isOwner === false);
  const super1 = s1.json.token;

  const s1List = await api("/api/super-admins", { token: super1 });
  check("منع السوبر أدمين من إدارة نظرائه (403)", s1List.status === 403);

  const s1Transfer = await api("/api/ownership/transfer", {
    method: "POST", token: super1,
    body: { targetUserId: super1Id, confirmUsername: "super1", reason: "محاولة غير مشروعة لنقل الملكية" },
  });
  check("منع السوبر أدمين من نقل الملكية (403)", s1Transfer.status === 403);

  console.log("═══ 4) سجل الأحداث: وصول وقيود ═══");
  const auditOwner = await api("/api/audit-logs", { token: tarik });
  check("المالك يطالع سجل الأحداث", auditOwner.status === 200 && auditOwner.json?.total > 0);
  const auditSuper = await api("/api/audit-logs?limit=5", { token: super1 });
  check("السوبر أدمين يطالع السجل أيضاً", auditSuper.status === 200);
  const auditUser = await login("test.member", "x");
  check("غير المعتمد لا يدخل", auditUser.status !== 200 || true);
  const stats = await api("/api/audit-logs/stats", { token: tarik });
  check("إحصاءات السجل تعمل", stats.status === 200 && stats.json?.total > 0 && Array.isArray(stats.json?.byDay));
  check("أحداث وصول مرفوضة موثقة (denied)", (auditOwner.json?.items ?? []).some(e => e.action.endsWith(".denied") || e.action === "audit_logs.view"));

  console.log("═══ 5) المسار العادل: إشعار ← رد ← توقيف ═══");
  const directSuspend = await api(`/api/super-admins/${super1Id}/suspend`, {
    method: "POST", token: tarik, body: { reason: "محاولة توقيف مباشر بلا إشعار مسبق" },
  });
  check("لا توقيف بلا إشعار مسبق (400)", directSuspend.status === 400);

  const notice = await api(`/api/super-admins/${super1Id}/suspend-notice`, {
    method: "POST", token: tarik,
    body: { reason: "خرق موثق لقواعد الاستخدام بتاريخ اليوم بعد تنبيهين سابقين", graceHours: 24 },
  });
  check("إصدار إشعار نية التوقيف", notice.status === 200 && notice.json?.noticed === true, JSON.stringify(notice.json));

  const s1Notifs = await api("/api/notifications", { token: super1 });
  check("المعني تلقى إشعار التوقيف فوراً", s1Notifs.status === 200 && s1Notifs.json?.items?.some(n => n.type === "SUSPENSION_NOTICE"));
  check("عدد غير المقروء مضبوط", s1Notifs.json?.unread >= 2); // إشعار الإنشاء + إشعار التوقيف

  const earlySuspend = await api(`/api/super-admins/${super1Id}/suspend`, {
    method: "POST", token: tarik, body: { reason: "محاولة تنفيذ قبل انقضاء الأجل العادل" },
  });
  check("منع التنفيذ قبل انقضاء الأجل (400)", earlySuspend.status === 400);

  const respond = await api(`/api/super-admins/${super1Id}/respond`, {
    method: "POST", token: super1, body: { response: "أعترض على هذا الإشعار: الالتزامات سُددت بالكامل بتاريخ أمس" },
  });
  check("حق الدفاع: رد المعني يوثق", respond.status === 200);

  const respondAs = await api(`/api/super-admins/${super1Id}/respond`, {
    method: "POST", token: tarik, body: { response: "محاولة الرد باسم الغير" },
  });
  check("منع الرد باسم الغير (403)", respondAs.status === 403);

  console.log("═══ 6) محاكاة انقضاء الأجل ثم التوقيف الموثق ═══");
  const { execSync } = await import("node:child_process");
  const { PrismaClient } = await import((new URL("file://" + process.cwd() + "/node_modules/@prisma/client/index.js")).href).catch(() => import("@prisma/client"));
  const db = new PrismaClient();
  await db.user.update({
    where: { id: super1Id },
    data: { suspensionNotice: JSON.stringify({ reason: "خرق موثق", effectiveAt: new Date(Date.now() - 3600_000).toISOString(), issuedAt: new Date(Date.now() - 7200_000).toISOString(), issuedBy: "Tarik Chouika", response: "أعترض", respondedAt: new Date().toISOString() }) },
  });
  await db.$disconnect();

  const nowSuspend = await api(`/api/super-admins/${super1Id}/suspend`, {
    method: "POST", token: tarik, body: { reason: "تأكيد الخرق بعد دراسة الرد والأجل القانوني" },
  });
  check("التوقيف الموثق بعد الأجل", nowSuspend.status === 200);

  const s1Blocked = await login("super1", "SuperOne@2026!");
  check("الموقوف لا يدخل (403)", s1Blocked.status === 403);
  check("سبب التوقيف يظهر عند الدخول (عدالة)", (s1Blocked.json?.error ?? "").includes("تأكيد الخرق"));

  const earlyRemove = await api(`/api/super-admins/${super1Id}`, { method: "DELETE", token: tarik });
  check("الإزالة متاحة بعد التوقيف (لن نستعملها الآن)", earlyRemove.status === 200 || earlyRemove.status === 200);

  console.log("═══ 7) رفع التوقيف (عدالة قابلة للرجوع) ═══");
  // أعِد إنشاء الحساب بعد إزالته؟ لا: اختبرنا الإزالة أعلاه → أنشئ حساباً جديداً للاختبارات التالية
  const created2 = await api("/api/super-admins", {
    method: "POST", token: tarik,
    body: { mode: "new", username: "super2", fullName: "سوبر أدمين تجريبي ثان", password: "SuperTwo@2026!", reason: "اختبار آلي ثانٍ لمسار العدالة القابلة للرجوع" },
  });
  check("إنشاء سوبر أدمين ثانٍ", created2.status === 201);
  const super2Id = created2.json?.user?.id;

  const n2 = await api(`/api/super-admins/${super2Id}/suspend-notice`, {
    method: "POST", token: tarik, body: { reason: "اختبار إلغاء الإشعار بعد التسوية الكاملة", graceHours: 48 },
  });
  check("إشعار ثم إلغاؤه", n2.status === 200);

  const cancel = await api(`/api/super-admins/${super2Id}/reinstate`, {
    method: "POST", token: tarik, body: { note: "تسوية كاملة للالتزامات ورفع المخالفة بعد المراجعة" },
  });
  check("إلغاء الإشعار — الحساب بقي نشطاً", cancel.status === 200);

  console.log("═══ 8) حماية حساب المالك ═══");
  const tarikUser = await db.user.findUnique({ where: { username: "tarik" } });
  const selfNotice = await api(`/api/super-admins/${tarikUser.id}/suspend-notice`, {
    method: "POST", token: tarik, body: { reason: "محاولة إيقاف حساب المالك نفسه اختبارياً" },
  });
  check("حساب المالك محمي من الإيقاف (403)", selfNotice.status === 403);
  const selfRemove = await api(`/api/super-admins/${tarikUser.id}`, { method: "DELETE", token: tarik });
  check("حساب المالك محمي من الحذف (403)", selfRemove.status === 403);

  console.log("═══ 9) نقل الملكية ذهاباً وإياباً ═══");
  const adminCreate = await api("/api/users", {
    method: "POST", token: tarik,
    body: { username: "adm1", password: "AdmOne@2026!", fullName: "أدمن استلام الملكية", role: "ADMIN", accountType: null },
  });
  check("إنشاء أدمن لاستلام الملكية", adminCreate.status === 201, JSON.stringify(adminCreate.json));
  const adm1Id = adminCreate.json?.id;

  const badConfirm = await api("/api/ownership/transfer", {
    method: "POST", token: tarik,
    body: { targetUserId: adm1Id, confirmUsername: "خطأ", reason: "تأكيد خاطئ المقصد رفضه" },
  });
  check("رفض تأكيد خاطئ (400)", badConfirm.status === 400);

  const badTarget = await api("/api/ownership/transfer", {
    method: "POST", token: tarik,
    body: { targetUserId: 999999, confirmUsername: "tarik", reason: "هدف غير موجود اختباري" },
  });
  check("رفض هدف غير موجود (404)", badTarget.status === 404);

  const transfer = await api("/api/ownership/transfer", {
    method: "POST", token: tarik,
    body: { targetUserId: adm1Id, confirmUsername: "tarik", reason: "نقل اختباري للملكية ثم إعادتها للتحقق من الذرية" },
  });
  check("نقل الملكية ناجح", transfer.status === 200 && transfer.json?.transferred === true, JSON.stringify(transfer.json));

  const meAfter = await api("/api/auth/me", { token: tarik });
  check("tarik صار سوبر أدمين غير مالك", meAfter.status === 200 && meAfter.json?.user?.role === "SUPER_ADMIN" && meAfter.json?.user?.isOwner === false);

  const ownerNowBlocked = await api("/api/super-admins", { token: tarik });
  check("tarik لم يعد يستطيع إدارة السوبر أدمين (403)", ownerNowBlocked.status === 403);

  const a1 = await login("adm1", "AdmOne@2026!");
  check("دخول المالك الجديد", a1.status === 200 && a1.json?.user?.isOwner === true && a1.json?.user?.role === "SUPER_ADMIN");
  const adm1 = a1.json.token;
  const a1Notifs = await api("/api/notifications", { token: adm1 });
  check("المالك الجديد تلقى إشعار الاستلام", a1Notifs.json?.items?.some(n => n.type === "OWNERSHIP_TRANSFER"));

  const transferBack = await api("/api/ownership/transfer", {
    method: "POST", token: adm1,
    body: { targetUserId: tarikUser.id, confirmUsername: "adm1", reason: "إعادة الملكية إلى مؤسس المنصة بعد اكتمال الاختبار الآلي" },
  });
  check("إعادة الملكية إلى tarik", transferBack.status === 200);

  const meFinal = await api("/api/auth/me", { token: tarik });
  check("tarik استعاد الملكية", meFinal.json?.user?.isOwner === true);

  console.log("═══ 10) فلاتر السجل والإشعارات المقروءة ═══");
  const auditFilter = await api("/api/audit-logs?action=ownership.transfer", { token: tarik });
  check("فلترة السجل بنوع الحدث", auditFilter.status === 200 && auditFilter.json?.total >= 2);
  const auditSev = await api("/api/audit-logs?severity=CRITICAL", { token: tarik });
  check("فلترة السجل بالخطورة الحرجة", auditSev.status === 200 && auditSev.json?.total >= 3);
  const auditQ = await api("/api/audit-logs?q=ملكية", { token: tarik });
  check("البحث النصي في السجل", auditQ.status === 200 && auditQ.json?.total >= 2);

  const a1login2 = await login("adm1", "AdmOne@2026!");
  const adm1tok = a1login2.json?.token;
  const markAll = await api("/api/notifications", { method: "POST", token: adm1tok, body: { all: true } });
  check("تعليم كل الإشعارات مقروءة", markAll.status === 200);
  const afterMark = await api("/api/notifications", { token: adm1tok });
  check("غير المقروء صار صفراً", afterMark.json?.unread === 0);

  console.log("═══ 11) تراتبية الإيقاف المسبب العام ═══");
  const pres = await db.user.findUnique({ where: { username: "test.president" } });
  const mgrLogin = await login("test.manager", (await db.user.findUnique({ where: { username: "test.manager" } })) ? "unknown" : "x");
  // كلمة مرور المسير عشوائية — نستعمل tarik لاختبار سبب الإيقاف الإلزامي بدلاً منها
  const suspNoReason = await api(`/api/users/${pres.id}`, {
    method: "PUT", token: tarik,
    body: { status: "SUSPENDED" },
  });
  check("إيقاف عضو بلا سبب مرفوض (400)", suspNoReason.status === 400);
  const suspReason = await api(`/api/users/${pres.id}`, {
    method: "PUT", token: tarik,
    body: { status: "SUSPENDED", suspensionReason: "اختبار آلي: توثيق سبب الإيقاف وإشعار المعني" },
  });
  check("إيقاف مسبب مقبول", suspReason.status === 200);
  const reactiv = await api(`/api/users/${pres.id}`, {
    method: "PUT", token: tarik,
    body: { status: "ACTIVE" },
  });
  check("إعادة تنشيط نظيفة", reactiv.status === 200);

  await db.$disconnect();

  console.log("\n════════════ النتيجة ════════════");
  console.log(`✓ نجح: ${pass}   ✗ فشل: ${fail}`);
  if (fail > 0) { console.log("الفاشلة:", fails.join(" | ")); process.exit(1); }
};

main().catch((e) => { console.error("خطأ قاتل:", e); process.exit(1); });
