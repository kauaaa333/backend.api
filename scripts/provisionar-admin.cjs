require('dotenv').config({ quiet: true });
require('dotenv').config({ path: '.env.admin.local', quiet: true });
const bcrypt = require('bcryptjs');
const prisma = require('../src/database/prisma');

async function main() {
  const email = process.env.TASKFLOW_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.TASKFLOW_ADMIN_INITIAL_PASSWORD;
  const expectedHost = process.env.TASKFLOW_ADMIN_EXPECTED_HOST;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !senha || senha.length < 20 || Buffer.byteLength(senha) > 72)
    throw new Error('Configure e-mail e senha inicial aleatória forte em .env.admin.local (ignorado pelo Git).');
  if (!expectedHost || new URL(process.env.DATABASE_URL).hostname !== expectedHost)
    throw new Error('Confirme o host de destino em TASKFLOW_ADMIN_EXPECTED_HOST antes de provisionar.');
  if (await prisma.usuarios.findUnique({ where: { email }, select: { id: true } }))
    throw new Error('A conta já existe. Nenhuma senha ou permissão foi alterada.');
  const usuario = await prisma.usuarios.create({
    data: { nome: 'Kauã', email, senha_hash: await bcrypt.hash(senha, 12), administrador: true },
    select: { id: true, email: true, administrador: true },
  });
  console.log(JSON.stringify({ provisioned: true, ...usuario }));
}
main().catch((erro) => { console.error(erro.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
