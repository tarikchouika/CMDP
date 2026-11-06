// ═══════════════════════════════════════════════════════════════════════════
// CMDP — فرص العمل والتعاقد (سوق مفتوح للعموم + نشر لتعاونيات مسجلة)
// GET عمومي: الفرص المفتوحة لتعاونيات مصادق عليها | POST: كوأدمن فأعلى
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { denied, getAuthUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const COOP_SELECT = { select: { id: true, name: true, sector: true, region: true, phone: true, email: true, approvalStatus: true } } as const;

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const sector = url.searchParams.get("sector");
  const region = url.searchParams.get("region");
  const q = url.searchParams.get("q");
  const mine = url.searchParams.get("mine"); // إدارة الفرص الخاصة بتعاونيتي

  // وضع الإدارة: صاحب الصلاحية يرى فرص تعاونيته بكل حالاتها
  if (mine) {
    const auth = await requirePermission(req, "post:opportunities");
    if ("response" in auth) return auth.response;
    const { user } = auth;
    const rows = await db.opportunity.findMany({
      where:
        user.role === "COADMIN"
          ? { cooperativeId: user.cooperativeId ?? -1 }
          : {
              cooperative: { approvalStatus: "APPROVED" },
              ...(type ? { type } : {}),
            },
      include: { cooperative: COOP_SELECT, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(
      rows.map((r) => {
        const { _count, ...rest } = r;
        return { ...rest, applicationsCount: _count.applications };
      })
    );
  }

  // وضع العموم: الفرص المفتوحة لتعاونيات مصادق عليها
  const rows = await db.opportunity.findMany({
    where: {
      status: "OPEN",
      cooperative: { approvalStatus: "APPROVED" },
      ...(type ? { type } : {}),
      ...(sector ? { sector } : {}),
      ...(region ? { region } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
    },
    include: { cooperative: COOP_SELECT, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    rows.map((r) => {
      const { _count, ...rest } = r;
      return { ...rest, applicationsCount: _count.applications };
    })
  );
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "post:opportunities");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const b = await readJson(req);
  const title = String(b.title ?? "").trim();
  const description = String(b.description ?? "").trim();
  if (!title || !description) return fail("العنوان والوصف إلزاميان");

  let cooperativeId = Number(b.cooperativeId ?? 0);
  if (user.role === "COADMIN") cooperativeId = user.cooperativeId ?? 0; // داخل تعاونيته حصراً
  const coop = await db.cooperative.findFirst({ where: { id: cooperativeId, approvalStatus: "APPROVED" } });
  if (!coop) return fail("التعاونية غير متاحة — اختر تعاونية مسجلة");
  if (user.role === "COADMIN" && cooperativeId !== user.cooperativeId) {
    return denied("لا يمكنك النشر إلا باسم تعاونيتك");
  }

  const row = await db.opportunity.create({
    data: {
      cooperativeId,
      type: ["JOB", "CONTRACT", "SERVICE_NEED", "INTERNSHIP"].includes(String(b.type))
        ? String(b.type)
        : "JOB",
      title,
      description,
      sector: String(b.sector ?? coop.sector),
      region: String(b.region ?? coop.region),
      city: b.city ? String(b.city) : null,
      positions: Math.max(1, Number(b.positions ?? 1)),
      contractType: b.contractType ? String(b.contractType) : null,
      requirements: b.requirements ? String(b.requirements) : null,
      deadline: b.deadline ? toDate(b.deadline) : null,
      contactEmail: b.contactEmail ? String(b.contactEmail) : coop.email,
      contactPhone: b.contactPhone ? String(b.contactPhone) : coop.phone,
      status: "OPEN",
    },
    include: { cooperative: COOP_SELECT },
  });
  await logAudit({
    req,
    actor: auth.user,
    action: "opportunity.create",
    entityType: "OPPORTUNITY",
    entityId: row.id,
    summary: `نشر فرصة: ${row.title} (${row.type})`,
    details: { cooperativeId: row.cooperativeId, type: row.type, region: row.region },
  });
  return ok(row, 201);
}

export async function PUT(req: Request) {
  // إعادة توجيه منطقية — التحديث يتم عبر /api/opportunities/[id]
  return fail("استعمل مسار العنصر الفردي للتحديث", 405);
}

export async function DELETE() {
  return fail("استعمل مسار العنصر الفردي للحذف", 405);
}
