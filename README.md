# TIGEM Acquisti Tool

Piattaforma web stile BioDeepXearch per l'ufficio acquisti TIGEM: ricerca categorie merceologiche Alyante, catalogo suppliers/distributori life science, alternative hunter.

---

## Deploy completo (primo avvio)

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Dai un nome (es. `tigem-acquisti`) → scegli la regione **West EU (Ireland)**
3. Una volta creato, vai su **Settings → API** e copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public key` → `SUPABASE_ANON_KEY`

4. Vai su **SQL Editor** → incolla ed esegui in ordine:

```
supabase/migrations/001_init.sql
supabase/seeds/001_categories.sql
supabase/seeds/002_distributors.sql
supabase/seeds/003_suppliers.sql
```

### 2. Ottieni la chiave Anthropic

1. Vai su [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key**
2. Copia la chiave (inizia con `sk-ant-...`)

### 3. Pubblica su GitHub

```bash
cd C:\Users\pepe\acquisti-tool
git init
git add .
git commit -m "Initial commit - TIGEM Acquisti Tool"
git remote add origin https://github.com/TUO_USERNAME/acquisti-tool.git
git branch -M main
git push -u origin main
```

### 4. Deploy su Railway

1. Vai su [railway.app](https://railway.app) → **New Project**
2. Scegli **Deploy from GitHub repo** → seleziona `acquisti-tool`
3. Railway rileva automaticamente Node.js
4. Vai su **Variables** e aggiungi:

| Nome | Valore |
|------|--------|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ADMIN_KEY` | una stringa segreta a scelta |

5. **Settings → Networking → Generate Domain** per l'URL pubblico.

---

## Funzionalita

### Dashboard
- Statistiche: suppliers, distributori, brand mappati, categorie
- Top distributori per numero brand
- Ricerca rapida brand dalla dashboard

### Categorie Alyante
- AI (Claude) suggerisce famiglia + sottofamiglia dal testo libero
- Punteggio confidenza 1-10
- Albero navigabile di tutte le categorie con filtro

### Alternative Hunter
- Cerca un brand e trova tutti i distributori disponibili
- Se non presente nel DB, l'AI suggerisce alternative equivalenti

### Catalog → Suppliers
- Griglia card con tutti i produttori life science
- Click per dettaglio: distributori italiani e condizioni acquisto

### Catalog → Distributors
- Griglia card con tutti i distributori
- Click per dettaglio: condizioni acquisto + lista brand (esclusiva/non)

### Catalog → Products
- Ricerca prodotti per codice, descrizione, supplier, gene symbol, tipo
