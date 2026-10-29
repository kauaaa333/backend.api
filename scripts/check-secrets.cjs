const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const issues = [];
for (const file of new Set(files)) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')) { issues.push(file + ': arquivo de credenciais'); continue; }
  const raw = fs.readFileSync(file);
  if (raw.includes(0) || raw.length > 2_000_000) continue;
  const text = raw.toString('utf8');
  for (const [n, line] of text.split(/\r?\n/).entries()) {
    const token = /\bgh[pousr]_[A-Za-z0-9]{30,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/.test(line);
    const urls = line.match(/postgres(?:ql)?:\/\/[^\s"'\x60<>]+/g) || [];
    const credentials = urls.some((value) => {
      try {
        const url = new URL(value);
        return url.password && !['127.0.0.1', 'localhost', 'postgres'].includes(url.hostname) &&
          !/SENHA|PASSWORD|EXEMPLO|example|USUARIO|\$\{|\{\{/i.test(value);
      } catch { return false; }
    });
    if (token || credentials) issues.push(file + ':' + (n + 1) + ': possível segredo (valor oculto)');
  }
}
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
else console.log('Nenhum segredo conhecido nos arquivos candidatos ao Git.');
