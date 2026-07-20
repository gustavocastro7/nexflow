# Deploy Vercel - Plano de Ação

## Diagnóstico

O projeto é um **monólito Next.js 15** (App Router) com **MySQL** via Sequelize.  
É **parcialmente compatível** com Vercel. Os principais bloqueios são:

| Problema | Impacto |
|----------|---------|
| MySQL (TCP persistente) | Serverless é stateless; conexões MySQL não sobrevivem |
| Sequelize pool (max 5) | Projetado para servidor fixo, não para funções efêmeras |
| `crypto.createHash('md5')` | Funciona apenas em runtime Node.js (não Edge) |
| Timeout 10s-60s | Imports bulk podem estourar o limite |
| Body limit 4.5MB | Faturas muito grandes podem ser rejeitadas |
| `.env` hardcoded | Secrets no repositório (JWT_SECRET, JEDI_USERS) |

---

## Roadmap

### 1. Banco de dados serverless

**Migrar de MySQL para PlanetScale** (MySQL-compatível, serverless):

- Subir schema no PlanetScale (`pscale database dump` + `pscale database restore`)
- Instalar `@planetscale/database` como driver alternativo
- Adaptar `lib/config/database.js` para usar conexão serverless
- **Alternativa:** Neon (PostgreSQL) + Drizzle ORM (mais trabalhoso, mas mais moderno)

### 2. Runtime das API Routes

As rotas que usam `crypto` ou Sequelize bulk precisam do runtime **Node.js** (não Edge):

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'mysql2'],
  },
};
export default nextConfig;
```

### 3. Upload de arquivos (invoices)

O conteúdo é enviado como JSON string (`request.json()`), o que ajuda.  
Para faturas grandes (>4.5MB):

- Adotar **Vercel Blob** para armazenar o arquivo bruto
- Enviar URL do blob em vez do conteúdo inline

### 4. Timeout em imports bulk

Operações longas (import de milhares de linhas) devem ser **background functions** (`maxDuration: 60`):

```ts
// app/api/invoices/claro-txt/import/route.ts
export const maxDuration = 60; // segundos (Vercel Pro)
```

Ou migrar para **fila de processamento** (Inngest / Vercel Queues).

### 5. Configuração de ambiente

Criar no Vercel Dashboard:
```
DB_HOST=   # PlanetScale host
DB_PORT=   # PlanetScale port (3306)
DB_NAME=nexflow_db
DB_USER=   # PlanetScale user
DB_PASS=   # PlanetScale password
JWT_SECRET=  # Secret forte
```

**Remover** `.env` do repositório (adicionar ao `.gitignore`).

### 6. Ajustes finais

- Adicionar `vercel.json` para configurar rotas e regiões
- Verificar se todas as dependencies são compatíveis com runtime Node.js na Vercel
- Build local (`npm run build`) para testar antes do deploy

---

## Comandos de deploy

```bash
# 1. Instalar CLI da Vercel
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy (seguir prompts)
vercel

# 4. Produção
vercel --prod
```

---

## Checklist

- [ ] Migrar banco para PlanetScale
- [ ] Adaptar `database.js` para serverless
- [ ] Configurar `next.config.ts` com runtime Node.js
- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Remover `.env` do repositório
- [ ] Adicionar `maxDuration` em rotas de import
- [ ] Testar build local (`npm run build`)
- [ ] Deploy preview + produção
