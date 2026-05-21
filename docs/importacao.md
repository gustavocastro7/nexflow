# Importação de Dados

## Importação de Faturas

### Formatos Suportados

| Formato | Rota | Separador | Descrição |
|---|---|---|---|
| Claro TXT | `/invoices/claro-txt/import` | `;` (ponto e vírgula) | Faturas detalhadas com seções, sub-seções, impostos |
| Claro Posicional | `/invoices/claro/import` | Posicional (fixed-width) | Faturas no formato legado da Claro |
| Vivo | `/invoices/vivo/import` | `\t` (tabulação) | Faturas tabuladas da Vivo |

### Fluxo de Importação

O sistema utiliza um fluxo em **3 etapas** para evitar duplicidade e garantir qualidade dos dados:

```
1. Selecionar arquivo → 2. Preview/validação → 3. Confirmar importação
```

#### Etapa 1: Seleção

- Clique em **"Importar Fatura"** na página de Gestão de Faturas
- Um dialog é aberto com seletor de **centro de custo** e botão para **selecionar arquivo**
- É possível escolher um centro de custo para associar as linhas telefônicas descobertas
- Se nenhum centro de custo for selecionado, as linhas são associadas ao **"Matriz"** (padrão)

#### Etapa 2: Preview (Validação)

Antes de importar, o sistema envia o arquivo para o endpoint de preview:

```
POST /invoices/{formato}/preview
Body: { content: string, workspaceId: uuid }
```

O preview retorna um relatório com:

| Campo | Descrição |
|---|---|
| `total` | Total de registros encontrados |
| `validCount` | Registros válidos |
| `invalidCount` | Registros com erro |
| `invalidItems` | Lista de erros (linha, conteúdo, motivo) |
| `phonesDiscovered` | Telefones encontrados |
| `preview` | Amostra dos 5 primeiros registros válidos |

**Validações aplicadas:**

- Telefone de origem vazio
- Data inválida (formato dd/mm/aaaa)
- Valor numérico inválido
- Linha com poucos campos
- Linha muito curta (formato posicional)

#### Etapa 3: Importação

```http
POST /invoices/{formato}/import
Content-Type: application/json

{
  "content": "conteúdo bruto do arquivo",
  "workspaceId": "uuid-do-workspace",
  "costCenterId": "uuid-do-centro-de-custo" // opcional
}
```

**Comportamento:**
- Apenas registros **válidos** são importados
- Registros com erro são **pulados** e contabilizados no resultado
- Linhas telefônicas novas são criadas automaticamente via `PhoneLine`
- Se `costCenterId` for informado, as novas linhas são vinculadas ao centro de custo
- Se a linha já existe sem centro de custo, é atualizada com o informado
- Linhas já vinculadas a outro CC não são alteradas
- A importação é registrada no log de auditoria

**Resposta:**
```json
{
  "message": "145 Claro TXT items imported successfully (5 lines skipped due to errors)",
  "imported": 145,
  "skipped": 5
}
```

### Duplicidade

O sistema calcula um hash MD5 do conteúdo bruto do arquivo. Se o mesmo arquivo já foi importado anteriormente para o mesmo workspace e operadora, a importação é rejeitada com erro:

```json
{
  "error": "This invoice has already been imported for this workspace."
}
```

### Formatos de Arquivo

#### Claro TXT

Arquivo texto com delimitador `;` (ponto e vírgula), encoding UTF-8.

```
Data de Vencimento: 15/04/2024 Valor: R$ 1.234,56
Cliente: 123456789
Tel;Seção;Data;Hora;Origem;Destino;Duração;Quantidade;Valor Total;Valor Cobrado;Usuário;Centro Custo;;Sub-Seção;Tipo Trib;Descrição
11999999999;VOZ;01/03/2024;08:00:00;011;11988888888;0:02:30;2,5;1,50;1,50;João Silva;TI;;LOCAL;ICMS;Chamada Local
```

**Colunas esperadas:**
1. Telefone
2. Seção (VOZ, DADOS, SMS)
3. Data (dd/mm/aaaa)
4. Hora
5. Local de origem
6. Telefone destino
7. Duração / Quantidade
8. Quantidade
9. Valor Total
10. Valor Cobrado
11. Usuário original
12. Centro de custo original
13. (vazio)
14. Sub-Seção
15. Tipo de tributação
16. Descrição

#### Claro Posicional (Fixed-Width)

Arquivo texto onde cada campo ocupa posições fixas na linha. Linhas que começam com `30` contêm registros de chamadas.

```
3011999999999          2024030108000000002:30Chamada Local                  000000000150
```

**Posições:**
- `2-26`: Telefone origem (25 chars)
- `27-34`: Data (AAAAMMDD)
- `43-48`: Hora (HHMMSS)
- `49-92`: Descrição (44 chars)
- `93-105`: Valor total (13 chars, centavos)

#### Vivo (Tabulação)

Arquivo texto com delimitador `\t` (tabulação).

```
Data	Hora	Origem	Destino	Duração	Descrição	Valor
01/03/2024	08:00:00	11999999999	11988888888	0:02:30	Chamada Local	1,50
```

### Endpoints de API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/invoices/claro-txt/preview` | Validar fatura Claro TXT sem importar |
| `POST` | `/invoices/claro-txt/import` | Importar fatura Claro TXT |
| `POST` | `/invoices/claro/preview` | Validar fatura Claro posicional |
| `POST` | `/invoices/claro/import` | Importar fatura Claro posicional |
| `POST` | `/invoices/vivo/preview` | Validar fatura Vivo |
| `POST` | `/invoices/vivo/import` | Importar fatura Vivo |
| `GET` | `/invoices` | Listar registros de faturas |
| `GET` | `/invoices/raw` | Listar faturas importadas (cabeçalhos) |
| `DELETE` | `/invoices/:id` | Remover fatura e registros associados |

---

## Importação de Colaboradores (CSV)

### Fluxo

```
1. Selecionar arquivo CSV → 2. Preview/validação → 3. Confirmar importação
```

### Formato do CSV

Arquivo texto com delimitador `;` ou `,` (detectado automaticamente), UTF-8.

```csv
nr;nome;cpf;centro de custo
5511999999991;João Silva;12345678901;TI
5511999999992;Maria Souza;98765432100;RH
5511999999993;Carlos Santos;11122233344;TI
```

**Colunas detectadas automaticamente** (qualquer ordem, case-insensitive):

| Coluna esperada | Nomes aceitos |
|---|---|
| Telefone | `nr`, `numero`, `telefone`, `phone` |
| Nome | `nome`, `name` |
| CPF | `cpf`, `documento`, `doc` |
| Centro de Custo | `centrodecusto`, `centro de custo`, `cc`, `costcenter`, `cost_center` |

### Validação

Antes de importar, o sistema valida o CSV:

```
POST /collaborators/csv/preview
Body: { content: string, workspaceId: uuid }
```

**Resposta:**
```json
{
  "total": 150,
  "validCount": 148,
  "invalidCount": 2,
  "invalidRows": [
    { "row": 3, "data": { "phone": "", "name": "", "cpf": "", "costCenter": "" }, "errors": ["CPF vazio", "Nome vazio"] }
  ],
  "toCreate": 120,
  "toUpdate": 28,
  "costCentersFound": 5,
  "costCentersToCreate": 2,
  "costCentersToCreateNames": ["Marketing", "Financeiro"]
}
```

### Regras de Importação

```http
POST /collaborators/csv/import
Content-Type: application/json

{
  "content": "conteúdo bruto do CSV",
  "workspaceId": "uuid-do-workspace"
}
```

**Comportamento:**

1. **CPF como chave única**: o campo `cpf` é mapeado para `external_id` do colaborador
   - Se já existe um colaborador com o mesmo CPF → **atualiza** o nome
   - Se não existe → **cria** novo colaborador
2. **Centro de Custo**: se não existir no workspace → **criado automaticamente** com `findOrCreate`
3. **Linha Telefônica**: associada ao colaborador e centro de custo
   - Se o telefone já existe → **atualiza** vínculo (collaborator_id, cost_center_id, responsible_name)
   - Se não existe → **cria** nova PhoneLine
4. Linhas com CPF ou nome vazios são **puladas**

**Resposta:**
```json
{
  "message": "145 colaboradores processados (120 criados, 25 atualizados), 148 linhas telefônicas, 2 centros de custo criados",
  "collaboratorsCreated": 120,
  "collaboratorsUpdated": 25,
  "costCentersCreated": 2,
  "costCentersFound": 5,
  "phoneLinesCreated": 130,
  "phoneLinesUpdated": 18,
  "skipped": 2,
  "costCentersCreatedNames": ["Marketing", "Financeiro"]
}
```

### Acesso

A importação CSV está disponível em dois lugares:
- **Menu do usuário** (dropdown do avatar no sidebar): "Importar CSV"
- **Página de Colaboradores**: botão "Importar CSV" ao lado de "Novo Colaborador"

### Endpoints de API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/collaborators/csv/preview` | Validar CSV sem importar |
| `POST` | `/collaborators/csv/import` | Importar CSV |
| `GET` | `/collaborators` | Listar colaboradores |
| `POST` | `/collaborators` | Criar colaborador individual |

---

## Modelo de Dados

### Relacionamentos

```
RawInvoice 1──* Invoice
Invoice.source_phone ── PhoneLine.phone_number
PhoneLine.cost_center_id ── CostCenter.id
PhoneLine.collaborator_id ── Collaborator.id
```

### Estrutura das Tabelas

#### `raw_invoices`
Armazena o cabeçalho de cada importação de fatura.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID FK | |
| operator | VARCHAR(20) | claro, vivo, claro_txt |
| content | JSONB | Conteúdo bruto + header extraído + validation stats |
| hash | VARCHAR(64) | MD5 do conteúdo (dedup) |
| due_date | DATE | Data de vencimento extraída |
| processing_status | ENUM | pendente, processado, erro |

#### `invoices`
Registros individuais de cada chamada/consumo.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID | |
| operator | VARCHAR(20) | |
| source_phone | VARCHAR(25) | Telefone de origem |
| item_date | DATE | Data do evento |
| total_value | DECIMAL(12,2) | |
| charged_value | DECIMAL(12,2) | |
| raw_invoice_id | UUID FK | Vínculo com a fatura importada |

#### `phone_lines`
Vincula telefones a colaboradores e centros de custo.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| phone_number | VARCHAR(25) | |
| responsible_name | VARCHAR(150) | |
| collaborator_id | UUID FK | |
| cost_center_id | UUID FK | |
| workspace_id | UUID FK | |

#### `collaborators`
Colaboradores do workspace.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(150) | |
| external_id | VARCHAR(50) | CPF ou ID externo (chave para dedup) |
| email | VARCHAR(150) | |
| department | VARCHAR(100) | |
| workspace_id | UUID FK | |

#### `cost_centers`
Centros de custo.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| code | VARCHAR(50) | Código do centro de custo |
| name | VARCHAR(255) | Nome |
| workspace_id | UUID FK | |
