const http = require("http");

// Dados em memória

const tarefas = [{ id: 1, texto: "Estudar Node", coluna: "afazer" }];

// Criar o servidor manualmente

const servidor = http.createServer((req, res) => {
  // Verificar a rota e o método manualmente

  if (req.url === "/tarefas" && req.method === "GET") {
    // Definir o header Content-Type manualmente

    res.writeHead(200, { "Content-Type": "application/json" });

    // Converter para JSON manualmente

    res.end(JSON.stringify(tarefas));
  } else if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });

    res.end(JSON.stringify({ status: "ok" }));
  } else {
    // 404 manual

    res.writeHead(404, { "Content-Type": "application/json" });

    res.end(JSON.stringify({ erro: "Rota não encontrada" }));
  }
});

// Iniciar o servidor

servidor.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
