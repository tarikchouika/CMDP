// ═══════════════════════════════════════════════════════════════════════════
// CMDP — منطق البذر المشترك (يستخدمه سكريبت prisma/seed.ts ومسار /api/seed)
// ═══════════════════════════════════════════════════════════════════════════

import type { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { dataset } from "./dataset";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

const D = (s: string) => new Date(s);

export async function runSeed(db: PrismaClient, adminPassword = "cmdp2026") {
  // تفريغ الجداول (ترتيب يحترم العلاقات — مع Cascade يكفي حذف الآباء)
  await db.opportunityApplication.deleteMany();
  await db.opportunity.deleteMany();
  await db.joinRequest.deleteMany();
  await db.assemblyVote.deleteMany();
  await db.assemblyAttendee.deleteMany();
  await db.entityInteraction.deleteMany();
  await db.regulation.deleteMany();
  await db.govEntity.deleteMany();
  await db.complianceTask.deleteMany();
  await db.document.deleteMany();
  await db.transaction.deleteMany();
  await db.meeting.deleteMany();
  await db.assembly.deleteMany();
  await db.member.deleteMany();
  await db.cooperative.deleteMany();
  await db.user.deleteMany();

  for (const c of dataset.cooperatives) {
    const { approvalStatus, approvalNote, ...rest } = c;
    await db.cooperative.create({
      data: {
        ...rest,
        foundingDate: D(rest.foundingDate),
        createdAt: D(rest.createdAt),
        approvalStatus,
        approvalNote,
      },
    });
  }
  for (const m of dataset.members) {
    await db.member.create({
      data: { ...m, joinDate: D(m.joinDate), createdAt: D(m.createdAt) },
    });
  }
  for (const a of dataset.assemblies) {
    await db.assembly.create({
      data: { ...a, date: D(a.date), createdAt: D(a.createdAt) },
    });
  }
  for (const m of dataset.meetings) {
    await db.meeting.create({
      data: { ...m, date: D(m.date), createdAt: D(m.createdAt) },
    });
  }
  for (const t of dataset.transactions) {
    await db.transaction.create({
      data: { ...t, date: D(t.date), createdAt: D(t.createdAt) },
    });
  }
  for (const d of dataset.documents) {
    await db.document.create({
      data: {
        ...d,
        issueDate: D(d.issueDate),
        expiryDate: d.expiryDate ? D(d.expiryDate) : null,
        createdAt: D(d.createdAt),
      },
    });
  }
  for (const e of dataset.entities) {
    const { interactions: _i, ...entityData } = e;
    await db.govEntity.create({ data: entityData });
  }
  for (const i of dataset.interactions) {
    const { entity: _e, ...interactionData } = i;
    await db.entityInteraction.create({ data: interactionData });
  }
  for (const r of dataset.regulations) {
    await db.regulation.create({
      data: { ...r, keyPoints: JSON.stringify(r.keyPoints), createdAt: D(r.createdAt) },
    });
  }
  for (const t of dataset.tasks) {
    await db.complianceTask.create({
      data: { ...t, dueDate: D(t.dueDate), createdAt: D(t.createdAt) },
    });
  }

  // ─── المستخدمون: حساب لكل دور + حسابات بانتظار المصادقة ──────────────────
  for (const u of dataset.users) {
    const { cooperativeName: _cn, ...userData } = u;
    await db.user.create({
      data: {
        ...userData,
        passwordHash: hashPassword(adminPassword),
        createdAt: D(u.createdAt),
      },
    });
  }

  // ─── طلبات الانخراط ──────────────────────────────────────────────────────
  for (const r of dataset.joinRequests) {
    const { cooperative: _c, ...reqData } = r;
    await db.joinRequest.create({
      data: { ...reqData, createdAt: D(r.createdAt) },
    });
  }

  // ─── فرص العمل والتعاقد ──────────────────────────────────────────────────
  for (const o of dataset.opportunities) {
    const { cooperative: _c, applicationsCount: _a, ...opData } = o;
    await db.opportunity.create({
      data: {
        ...opData,
        deadline: opData.deadline ? D(opData.deadline) : null,
        createdAt: D(opData.createdAt),
      },
    });
  }

  // ─── الترشيحات ────────────────────────────────────────────────────────────
  for (const a of dataset.applications) {
    const { opportunity: _o, ...appData } = a;
    await db.opportunityApplication.create({
      data: { ...appData, createdAt: D(a.createdAt) },
    });
  }

  return {
    cooperatives: dataset.cooperatives.length,
    members: dataset.members.length,
    assemblies: dataset.assemblies.length,
    meetings: dataset.meetings.length,
    transactions: dataset.transactions.length,
    documents: dataset.documents.length,
    entities: dataset.entities.length,
    interactions: dataset.interactions.length,
    regulations: dataset.regulations.length,
    tasks: dataset.tasks.length,
    users: dataset.users.length,
    joinRequests: dataset.joinRequests.length,
    opportunities: dataset.opportunities.length,
    applications: dataset.applications.length,
  };
}
