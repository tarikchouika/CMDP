// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المصادقة بالرموز (HMAC موقّع) وحراسة الصلاحيات في الباك إند
// الرمز: base64url({uid, exp}) + "." + توقيع HMAC-SHA256 — صلاحية 7 أيام
// ═══════════════════════════════════════════════════════════════════════════

import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { can, canAccessCooperative, type Permission } from "@/lib/permissions";
import type { AccountType, Role, SessionUser, UserStatus } from "@/lib/types";

const SECRET = process.env.CMDP_AUTH_SECRET || "cmdp-dev-secret-change-me";
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000; // أسبوع

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function hmac(payload: string): string {
  return b64url(createHmac("sha256", SECRET).update(payload).digest());
}

/** إصدار رمز لمستخدم */
export function signToken(userId: number): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${hmac(payload)}`;
}

/** التحقق من رمز — يعيد معرّف المستخدم أو فارغاً */
export function verifyToken(token: string): number | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(hmac(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as {
      uid: number;
      exp: number;
    };
    if (!data?.uid || !data?.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

/** استخراج المستخدم من ترويسة Authorization */
export async function getAuthUser(req: Request): Promise<SessionUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const uid = verifyToken(token);
  if (uid == null) return null;
  const u = await db.user.findUnique({ where: { id: uid }, include: { cooperative: true } });
  if (!u || u.status !== "ACTIVE") return null;
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role as Role,
    accountType: (u.accountType as AccountType | null) ?? null,
    cooperativeId: u.cooperativeId ?? null,
    cooperativeName: u.cooperative?.name ?? null,
    status: u.status as UserStatus,
    isOwner: u.role === "SUPER_ADMIN" ? u.isOwner : false,
  };
}

/** مشروع الصلاحية: يرفض الطلب إن لم يملك المستخدم الإذن */
export async function requirePermission(
  req: Request,
  permission: Permission
): Promise<{ user: SessionUser } | { response: Response }> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      response: Response.json(
        { error: "يلزم تسجيل الدخول للقيام بهذه العملية" },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      ),
    };
  }
  if (!can(user, permission)) {
    return {
      response: Response.json(
        { error: "لا تتوفر لديك الصلاحية للقيام بهذه العملية" },
        { status: 403, headers: { "Access-Control-Allow-Origin": "*" } }
      ),
    };
  }
  return { user };
}

/** التحقق من صلاحية الوصول لتعاونية محددة (كوأدمن داخل تعاونيته) */
export function coopAccessDenied(user: SessionUser, cooperativeId: number): boolean {
  return !canAccessCooperative(user, cooperativeId);
}

/** الرفض الموحّد للطلبات */
export function denied(message: string, status = 403): Response {
  return Response.json({ error: message }, { status, headers: { "Access-Control-Allow-Origin": "*" } });
}
