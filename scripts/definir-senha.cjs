require('dotenv').config({ quiet: true });
require('dotenv').config({ path: '.env.admin.local', quiet: true });
const bcrypt = require('bcryptjs');
const prisma = require('../src/database/prisma');
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const senha = process.env.NOVA_SENHA;
  if (!email || !senha || senha.length < 12 || Buffer.byteLength(senha) > 72)
    throw new Error('Informe EMAIL e uma NOVA_SENHA forte no ambiente do processo.');
  if (new URL(process.env.DATABASE_URL).hostname !== process.env.TASKFLOW_ADMIN_EXPECTED_HOST)
    throw new Error('Host de destino não confirmado.');
  const u = await prisma.usuarios.update({ where: { email }, data: { senha_hash: await bcrypt.hash(senha, 12) }, select: { id: true } });
  console.log('Senha atualizada; sessões anteriores serão recusadas. Conta ID ' + u.id);
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
