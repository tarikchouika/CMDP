import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.order.deleteMany({});
await p.product.deleteMany({});
console.log('نُظفت بيانات اختبار المتجر (طلبات + منتجات)');
await p.$disconnect();
