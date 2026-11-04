import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  const rows = await db.cooperative.findMany({ orderBy: { id: "asc" } });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b.name || !b.registrationNumber) return fail("الاسم ورقم التسجيل إلزاميان");
  try {
    const row = await db.cooperative.create({
      data: {
        name: String(b.name),
        registrationNumber: String(b.registrationNumber),
        odcCardNumber: b.odcCardNumber ? String(b.odcCardNumber) : null,
        sector: String(b.sector ?? "الخدمات"),
        region: String(b.region ?? ""),
        province: String(b.province ?? ""),
        commune: b.commune ? String(b.commune) : null,
        presidentName: String(b.presidentName ?? ""),
        phone: b.phone ? String(b.phone) : null,
        email: b.email ? String(b.email) : null,
        address: b.address ? String(b.address) : null,
        foundingDate: toDate(b.foundingDate),
        status: String(b.status ?? "ACTIVE"),
        notes: b.notes ? String(b.notes) : null,
      },
    });
    return ok(row, 201);
  } catch {
    return fail("تعذر إنشاء التعاونية — تحقق من عدم تكرار رقم التسجيل", 409);
  }
}
