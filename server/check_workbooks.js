const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.workbook.findMany({ select: { id: true, bookUid: true, orderUid: true } })
    .then(r => { console.log(JSON.stringify(r, null, 2)); p.$disconnect(); });