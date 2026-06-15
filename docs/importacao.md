# Data Import

## Invoice Import

### Supported Formats

| Format | Route | Separator | Description |
|---|---|---|---|
| Claro TXT | `/invoices/claro-txt/import` | `;` (semicolon) | Detailed invoices with sections, sub-sections, taxes |
| Claro Positional | `/invoices/claro/import` | Positional (fixed-width) | Legacy Claro invoice format |
| Vivo | `/invoices/vivo/import` | `\t` (tabulation) | Tabulated Vivo invoices |

### Import Flow

The system uses a **3-step** flow to avoid duplication and ensure data quality:

```
1. Select file → 2. Preview/validation → 3. Confirm import
```

#### Step 1: Selection

- Click **"Import Invoice"** on the Invoice Management page
- A dialog opens with a **cost center** selector and a button to **select file**
- It is possible to choose a cost center to associate the discovered phone lines
- If no cost center is selected, the lines are associated with the **"Headquarters"** (default)

#### Step 2: Preview (Validation)

Before importing, the system sends the file to the preview endpoint:

```
POST /invoices/{format}/preview
Body: { content: string, workspaceId: uuid }
```

The preview returns a report with:

| Field | Description |
|---|---|
| `total` | Total records found |
| `validCount` | Valid records |
| `invalidCount` | Records with errors |
| `invalidItems` | List of errors (line, content, reason) |
| `phonesDiscovered` | Phones discovered |
| `preview` | Sample of the first 5 valid records |

**Validations applied:**

- Empty source phone
- Invalid date (format dd/mm/yyyy)
- Invalid numeric value
- Line with few fields
- Line too short (positional format)

#### Step 3: Import

```http
POST /invoices/{format}/import
Content-Type: application/json

{
  "content": "raw file content",
  "workspaceId": "workspace-uuid",
  "costCenterId": "cost-center-uuid" // optional
}
```

**Behavior:**
- Only **valid** records are imported
- Records with errors are **skipped** and counted in the result
- New phone lines are automatically created via `PhoneLine`
- If `costCenterId` is provided, new lines are linked to the cost center
- If the line already exists without a cost center, it is updated with the provided one
- Lines already linked to another CC are not changed
- The import is recorded in the audit log

**Response:**
```json
{
  "message": "145 Claro TXT items imported successfully (5 lines skipped due to errors)",
  "imported": 145,
  "skipped": 5
}
```

### Duplication

The system calculates an MD5 hash of the raw file content. If the same file has been imported previously for the same workspace and operator, the import is rejected with an error:

```json
{
  "error": "This invoice has already been imported for this workspace."
}
```

### File Formats

#### Claro TXT

Text file with `;` (semicolon) delimiter, UTF-8 encoding.

```
Due Date: 15/04/2024 Value: R$ 1.234,56
Customer: 123456789
Tel;Section;Date;Time;Origin;Destination;Duration;Quantity;Total Value;Charged Value;User;Cost Center;;Sub-Section;Tax Type;Description
11999999999;VOICE;01/03/2024;08:00:00;011;11988888888;0:02:30;2,5;1,50;1,50;John Silva;IT;;LOCAL;ICMS;Local Call
```

**Expected columns:**
1. Phone
2. Section (VOICE, DATA, SMS)
3. Date (dd/mm/yyyy)
4. Time
5. Origin location
6. Destination phone
7. Duration / Quantity
8. Quantity
9. Total Value
10. Charged Value
11. Original User
12. Original Cost Center
13. (empty)
14. Sub-Section
15. Tax Type
16. Description

#### Claro Positional (Fixed-Width)

Text file where each field occupies fixed positions in the line. Lines starting with `30` contain call records.

```
3011999999999          2024030108000000002:30Local Call                   000000000150
```

**Positions:**
- `2-26`: Origin phone (25 chars)
- `27-34`: Date (YYYYMMDD)
- `43-48`: Time (HHMMSS)
- `49-92`: Description (44 chars)
- `93-105`: Total value (13 chars, cents)

#### Vivo (Tabulation)

Text file with `\t` (tabulation) delimiter.

```
Date	Time	Origin	Destination	Duration	Description	Value
01/03/2024	08:00:00	11999999999	11988888888	0:02:30	Local Call	1,50
```

### API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/invoices/claro-txt/preview` | Validate Claro TXT invoice without importing |
| `POST` | `/invoices/claro-txt/import` | Import Claro TXT invoice |
| `POST` | `/invoices/claro/preview` | Validate Claro positional invoice |
| `POST` | `/invoices/claro/import` | Import Claro positional invoice |
| `POST` | `/invoices/vivo/preview` | Validate Vivo invoice |
| `POST` | `/invoices/vivo/import` | Import Vivo invoice |
| `GET` | `/invoices` | List invoice records |
| `GET` | `/invoices/raw` | List imported invoices (headers) |
| `DELETE` | `/invoices/:id` | Remove invoice and associated records |

---

## Collaborator Import (CSV)

### Flow

```
1. Select CSV file → 2. Preview/validation → 3. Confirm import
```

### CSV Format

Text file with `;` or `,` delimiter (automatically detected), UTF-8.

```csv
nr;name;cpf;cost center
5511999999991;John Silva;12345678901;IT
5511999999992;Maria Souza;98765432100;HR
5511999999993;Carlos Santos;11122233344;IT
```

**Automatically detected columns** (any order, case-insensitive):

| Expected Column | Accepted Names |
|---|---|
| Phone | `nr`, `number`, `phone`, `telephone` |
| Name | `name` |
| CPF | `cpf`, `document`, `doc` |
| Cost Center | `costcenter`, `cost center`, `cc` |

### Validation

Before importing, the system validates the CSV:

```
POST /collaborators/csv/preview
Body: { content: string, workspaceId: uuid }
```

**Response:**
```json
{
  "total": 150,
  "validCount": 148,
  "invalidCount": 2,
  "invalidRows": [
    { "row": 3, "data": { "phone": "", "name": "", "cpf": "", "costCenter": "" }, "errors": ["Empty CPF", "Empty Name"] }
  ],
  "toCreate": 120,
  "toUpdate": 28,
  "costCentersFound": 5,
  "costCentersToCreate": 2,
  "costCentersToCreateNames": ["Marketing", "Finance"]
}
```

### Import Rules

```http
POST /collaborators/csv/import
Content-Type: application/json

{
  "content": "raw CSV content",
  "workspaceId": "workspace-uuid"
}
```

**Behavior:**

1. **CPF as unique key**: the `cpf` field is mapped to `external_id` of the collaborator
   - If a collaborator with the same CPF already exists → **update** the name
   - If it does not exist → **create** new collaborator
2. **Cost Center**: if it does not exist in the workspace → **automatically created** with `findOrCreate`
3. **Phone Line**: associated with the collaborator and cost center
   - If the phone already exists → **update** link (collaborator_id, cost_center_id, responsible_name)
   - If it does not exist → **create** new PhoneLine
4. Lines with empty CPF or name are **skipped**

**Response:**
```json
{
  "message": "145 collaborators processed (120 created, 25 updated), 148 phone lines, 2 cost centers created",
  "collaboratorsCreated": 120,
  "collaboratorsUpdated": 25,
  "costCentersCreated": 2,
  "costCentersFound": 5,
  "phoneLinesCreated": 130,
  "phoneLinesUpdated": 18,
  "skipped": 2,
  "costCentersCreatedNames": ["Marketing", "Finance"]
}
```

### Access

CSV import is available in two places:
- **User menu** (avatar dropdown in sidebar): "Import CSV"
- **Collaborators page**: "Import CSV" button next to "New Collaborator"

### API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/collaborators/csv/preview` | Validate CSV without importing |
| `POST` | `/collaborators/csv/import` | Import CSV |
| `GET` | `/collaborators` | List collaborators |
| `POST` | `/collaborators` | Create individual collaborator |

---

## Data Model

### Relationships

```
RawInvoice 1──* Invoice
Invoice.source_phone ── PhoneLine.phone_number
PhoneLine.cost_center_id ── CostCenter.id
PhoneLine.collaborator_id ── Collaborator.id
```

### Table Structure

#### `raw_invoices`
Stores the header of each invoice import.

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID FK | |
| operator | VARCHAR(20) | claro, vivo, claro_txt |
| content | JSONB | Raw content + extracted header + validation stats |
| hash | VARCHAR(64) | MD5 of content (dedup) |
| due_date | DATE | Extracted due date |
| processing_status | ENUM | pending, processed, error |

#### `invoices`
Individual records of each call/consumption.

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID | |
| operator | VARCHAR(20) | |
| source_phone | VARCHAR(25) | Source phone |
| item_date | DATE | Event date |
| total_value | DECIMAL(12,2) | |
| charged_value | DECIMAL(12,2) | |
| raw_invoice_id | UUID FK | Link to imported invoice |

#### `phone_lines`
Links phones to collaborators and cost centers.

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| phone_number | VARCHAR(25) | |
| responsible_name | VARCHAR(150) | |
| collaborator_id | UUID FK | |
| cost_center_id | UUID FK | |
| workspace_id | UUID FK | |

#### `collaborators`
Workspace collaborators.

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(150) | |
| external_id | VARCHAR(50) | CPF or external ID (key for dedup) |
| email | VARCHAR(150) | |
| department | VARCHAR(100) | |
| workspace_id | UUID FK | |

#### `cost_centers`
Cost centers.

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| code | VARCHAR(50) | Cost center code |
| name | VARCHAR(255) | Name |
| workspace_id | UUID FK | |
