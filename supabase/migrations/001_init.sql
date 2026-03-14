-- Estensione per ricerca fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Categorie merceologiche Alyante
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  numero INTEGER,
  famiglia TEXT NOT NULL,
  sottofamiglia TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fornitori / Suppliers (aziende produttrici / case madri)
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  tipo TEXT DEFAULT 'supplier',
  paese TEXT,
  sito_web TEXT,
  descrizione TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distributori italiani/europei
CREATE TABLE IF NOT EXISTS distributors (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  paese TEXT DEFAULT 'Italia',
  sito_web TEXT,
  logo_url TEXT,
  min_ordine TEXT,
  spese_spedizione TEXT,
  spese_ghiaccio_secco TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relazione: distributore → brand distribuiti
CREATE TABLE IF NOT EXISTS distributor_brands (
  id SERIAL PRIMARY KEY,
  distributore TEXT NOT NULL,
  brand TEXT NOT NULL,
  esclusiva BOOLEAN DEFAULT FALSE,
  regione TEXT DEFAULT 'Italia',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prodotti (per ricerca prodotti)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  codice TEXT,
  descrizione TEXT NOT NULL,
  supplier TEXT,
  tipo_prodotto TEXT,
  gene_symbol TEXT,
  categoria_famiglia TEXT,
  categoria_sottofamiglia TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_categories_famiglia ON categories(famiglia);
CREATE INDEX IF NOT EXISTS idx_categories_search ON categories USING gin(sottofamiglia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_suppliers_nome ON suppliers USING gin(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_distributors_nome ON distributors USING gin(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_distributor_brands_brand ON distributor_brands USING gin(brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_distributor_brands_distributore ON distributor_brands(distributore);
CREATE INDEX IF NOT EXISTS idx_products_desc ON products USING gin(descrizione gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_codice ON products(codice);
