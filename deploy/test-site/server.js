const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nexflow - Site de Teste</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                color: #fff;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }
            .container { padding: 2rem; }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            p { font-size: 1.1rem; opacity: 0.8; }
            .status {
                display: inline-block;
                margin-top: 2rem;
                padding: 0.5rem 1.5rem;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 50px;
                font-size: 0.9rem;
                opacity: 0.6;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🚧</div>
            <h1>Em Construção</h1>
            <p>Nexflow — Servidor Node.js ativo</p>
            <div class="status">Ambiente: production</div>
        </div>
    </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Test site running on port ${PORT}`);
});