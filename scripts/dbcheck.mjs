import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({ select: { id: true, username: true, fullName: true, role: true, accountType: true, status: true, cooperativeId: true } });
console.log('=== USERS ===');
users.forEach(u => console.log(`${u.id} | ${u.username} | ${u.fullName} | ${u.role}/${u.accountType} | ${u.status} | coop:${u.cooperativeId}`));
const [coops, members, prods, orders, txs] = await Promise.all([
  p.cooperative.count(), p.member.count(), p.product.count(), p.order.count(), p.transaction.count()
]);
console.log(`\ncooperatives=${coops} members=${members} products=${prods} orders=${orders} transactions=${txs}`);
const sampleProds = await p.product.findMany({ take: 2, select: { id: true, name: true, price: true, status: true } });
console.log('sample products:', JSON.stringify(sampleProds));
const sampleOrders = await p.order.findMany({ take: 2, select: { id: true, customerName: true, status: true, quantity: true } });
console.log('sample orders:', JSON.stringify(sampleOrders));
await p.$disconnect();
