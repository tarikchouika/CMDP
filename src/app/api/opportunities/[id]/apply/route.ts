// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الترشح لفرصة (متاح للزوار بمعلومات الاتصال وللمستخدمين بحساباتهم)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await db.opportunity.findUnique({
    where: { id: Number(id) },
    include: { cooperative: true },
  });
  if (!opportunity) return fail("الفرصة غير موجودة", 404);
  if (opportunity.status !== "OPEN" || opportunity.cooperative.approvalStatus !== "APPROVED") {
    return fail("هذه الفرصة مغلقة", 409);
  }
  if (opportunity.deadline && new Date(opportunity.deadline) < new Date()) {
    return fail("انتهى أجل الترشح لهذه الفرصة", 409);
  }

  const user = await getAuthUser(req);
  const b = await readJson(req);
  const fullName = String(b.fullName ?? "").trim();
  const email = String(b.email ?? "").trim() || null;
  const phone = String(b.phone ?? "").trim() || null;
  if (!fullName) return fail("الاسم الكامل مطلوب");
  if (!email && !phone) return fail("أدخل بريداً إلكترونياً أو رقم هاتف للتواصل");

  // منع الترشح المكرر
  const dup = await db.opportunityApplication.findFirst({
    where: {
      opportunityId: opportunity.id,
      OR: [
        ...(user ? [{ userId: user.id }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });
  if (dup) return fail("سبق تسجيل ترشيحكم لهذه الفرصة", 409);

  const row = await db.opportunityApplication.create({
    data: {
      opportunityId: opportunity.id,
      userId: user?.id ?? null,
      fullName,
      email,
      phone,
      motivation: b.motivation ? String(b.motivation).slice(0, 1500) : null,
      experience: b.experience ? String(b.experience).slice(0, 1500) : null,
      status: "PENDING",
    },
  });
  await logAudit({
    req,
    actor: user,
    action: "opportunity.apply",
    entityType: "APPLICATION",
    entityId: row.id,
    summary: `ترشح جديد على «${opportunity.title}»: ${fullName}`,
    details: { opportunityId: opportunity.id, userId: user?.id ?? null },
  });
  return ok(
    {
      message: "تم تسجيل ترشيحكم بنجاح — ستتواصل معكم التعاونية عند القبول.",
      application: row,
    },
    201
  );
}
