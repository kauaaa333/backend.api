const http = require('http');

const tarefas = [{ id: 1, texto: 'Estudar Node', coluna: 'afazer' }];

const servidor = http.createServer((req, res) => {
  if (req.url === '/tarefas' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    res.end(JSON.stringify(tarefas));
  } else if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });

    res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
  }
});

servidor.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
