const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Dashboard stats ─────────────────────────────────────────────────────────

app.get('/api/stats', async (req, res) => {
  const [cats, dists, brands, supps, prods] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('distributors').select('id', { count: 'exact', head: true }),
    supabase.from('distributor_brands').select('id', { count: 'exact', head: true }),
    supabase.from('suppliers').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
  ]);
  res.json({
    categorie: cats.count || 0,
    distributori: dists.count || 0,
    brand: brands.count || 0,
    suppliers: supps.count || 0,
    prodotti: prods.count || 0,
  });
});

// ─── Categories ──────────────────────────────────────────────────────────────

app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('numero')
    .order('famiglia')
    .order('sottofamiglia');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/categories/match', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Descrizione richiesta' });

  const { data: categories, error } = await supabase
    .from('categories')
    .select('numero, famiglia, sottofamiglia')
    .order('numero');
  if (error) return res.status(500).json({ error: error.message });

  const catList = categories
    .map(c => `[${c.numero}] Famiglia: "${c.famiglia}" | Sottofamiglia: "${c.sottofamiglia}"`)
    .join('\n');

  const prompt = `Sei un esperto di acquisti per un istituto di ricerca biomedica (TIGEM - Fondazione Telethon).
Hai un sistema gestionale Alyante con le seguenti categorie merceologiche:

${catList}

L'utente ha inserito questa descrizione di prodotto/servizio: "${description}"

Suggerisci le 1-3 categorie più appropriate. Per ogni suggerimento fornisci:
- La famiglia esatta (deve corrispondere esattamente al testo sopra)
- La sottofamiglia esatta (deve corrispondere esattamente al testo sopra)
- Un punteggio di confidenza da 1 a 10
- Una breve spiegazione (max 1 riga)

Rispondi SOLO con JSON valido, senza testo aggiuntivo:
{"suggerimenti":[{"famiglia":"...","sottofamiglia":"...","confidenza":9,"spiegazione":"..."}]}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Risposta AI non valida');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    res.status(500).json({ error: 'Errore AI: ' + err.message });
  }
});

// ─── Suppliers ───────────────────────────────────────────────────────────────

app.get('/api/suppliers', async (req, res) => {
  const { q } = req.query;
  let query = supabase.from('suppliers').select('*').order('nome');
  if (q?.trim()) query = query.ilike('nome', `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/suppliers/:nome', async (req, res) => {
  const { nome } = req.params;
  // Get supplier info
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .ilike('nome', `%${nome}%`)
    .single();

  // Find distributors that carry this brand
  const { data: distributors } = await supabase
    .from('distributor_brands')
    .select('distributore, esclusiva, regione')
    .ilike('brand', `%${nome}%`)
    .order('esclusiva', { ascending: false });

  // Get conditions for those distributors
  const distNames = [...new Set((distributors || []).map(d => d.distributore))];
  const { data: conditions } = distNames.length
    ? await supabase.from('distributors').select('*').in('nome', distNames)
    : { data: [] };

  const condMap = {};
  (conditions || []).forEach(c => { condMap[c.nome] = c; });

  res.json({
    supplier: supplier || { nome, descrizione: 'Informazioni non disponibili nel database' },
    distributori: (distributors || []).map(d => ({
      ...d,
      condizioni: condMap[d.distributore] || null
    }))
  });
});

// ─── Distributors ────────────────────────────────────────────────────────────

app.get('/api/distributors', async (req, res) => {
  const { q } = req.query;
  let query = supabase.from('distributors').select('*').order('nome');
  if (q?.trim()) query = query.ilike('nome', `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/distributors/:nome/brands', async (req, res) => {
  const { nome } = req.params;
  const { data: brands } = await supabase
    .from('distributor_brands')
    .select('brand, esclusiva')
    .ilike('distributore', `%${nome}%`)
    .order('esclusiva', { ascending: false })
    .order('brand');

  const { data: conditions } = await supabase
    .from('distributors')
    .select('*')
    .ilike('nome', `%${nome}%`)
    .single();

  res.json({ brands: brands || [], condizioni: conditions || null });
});

// Brand search (with fuzzy AI fallback)
app.get('/api/distributors/search', async (req, res) => {
  const { brand } = req.query;
  if (!brand?.trim()) return res.status(400).json({ error: 'Brand richiesto' });

  const { data: exactMatches, error } = await supabase
    .from('distributor_brands')
    .select('distributore, brand, esclusiva')
    .ilike('brand', `%${brand.trim()}%`)
    .order('esclusiva', { ascending: false })
    .order('distributore');

  if (error) return res.status(500).json({ error: error.message });

  if (exactMatches.length > 0) {
    const distNames = [...new Set(exactMatches.map(m => m.distributore))];
    const { data: conditions } = await supabase.from('distributors').select('*').in('nome', distNames);
    const condMap = {};
    (conditions || []).forEach(c => { condMap[c.nome] = c; });
    return res.json({
      trovati: exactMatches.map(m => ({ ...m, condizioni: condMap[m.distributore] || null })),
      tipo: 'match_diretto'
    });
  }

  // AI fuzzy fallback
  const { data: allBrands } = await supabase.from('distributor_brands').select('distributore, brand, esclusiva');
  if (!allBrands?.length) return res.json({ trovati: [], tipo: 'nessun_risultato' });

  const brandList = [...new Set(allBrands.map(b => b.brand))].join(', ');
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: `Lista brand: ${brandList}\n\nL'utente cerca: "${brand}"\n\nQuale brand corrisponde meglio? Considera abbreviazioni e variazioni. JSON: {"brand_trovato":"...","confidenza":0-10} oppure {"brand_trovato":null}` }]
    });
    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiResult = JSON.parse(jsonMatch[0]);
      if (aiResult.brand_trovato && aiResult.confidenza >= 5) {
        const { data: fuzzyMatches } = await supabase
          .from('distributor_brands')
          .select('distributore, brand, esclusiva')
          .ilike('brand', `%${aiResult.brand_trovato}%`);
        if (fuzzyMatches?.length) {
          const distNames = [...new Set(fuzzyMatches.map(m => m.distributore))];
          const { data: conditions } = await supabase.from('distributors').select('*').in('nome', distNames);
          const condMap = {};
          (conditions || []).forEach(c => { condMap[c.nome] = c; });
          return res.json({
            trovati: fuzzyMatches.map(m => ({ ...m, condizioni: condMap[m.distributore] || null })),
            tipo: 'match_fuzzy',
            brand_suggerito: aiResult.brand_trovato
          });
        }
      }
    }
  } catch (_) {}

  res.json({ trovati: [], tipo: 'nessun_risultato' });
});

// ─── Alternative Hunter (trova distributori alternativi per un brand) ────────

app.post('/api/alternative-hunter', async (req, res) => {
  const { brand, distributore_attuale } = req.body;
  if (!brand?.trim()) return res.status(400).json({ error: 'Brand richiesto' });

  // Find all distributors for this brand
  const { data: matches } = await supabase
    .from('distributor_brands')
    .select('distributore, brand, esclusiva')
    .ilike('brand', `%${brand.trim()}%`);

  if (!matches?.length) {
    // Ask AI for alternative brands/suppliers
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `Sei un esperto procurement life science. Il brand "${brand}" non è nel nostro database distributori. Suggerisci 3-5 alternative (brand simili o equivalenti) che producano prodotti comparabili. JSON: {"alternative":[{"brand":"...","motivo":"..."}]}` }]
      });
      const text = message.content[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return res.json({ ...JSON.parse(jsonMatch[0]), tipo: 'ai_alternative' });
    } catch (_) {}
    return res.json({ trovati: [], tipo: 'nessun_risultato' });
  }

  const distNames = [...new Set(matches.map(m => m.distributore))];
  const { data: conditions } = await supabase.from('distributors').select('*').in('nome', distNames);
  const condMap = {};
  (conditions || []).forEach(c => { condMap[c.nome] = c; });

  res.json({
    brand: matches[0]?.brand || brand,
    distributori: matches.map(m => ({
      ...m,
      condizioni: condMap[m.distributore] || null,
      is_attuale: distributore_attuale && m.distributore.toLowerCase().includes(distributore_attuale.toLowerCase())
    })),
    tipo: 'trovato'
  });
});

// ─── Products search ─────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  const { codice, descrizione, supplier, tipo, gene } = req.query;
  let query = supabase.from('products').select('*').order('descrizione').limit(100);

  if (codice?.trim()) query = query.ilike('codice', `%${codice.trim()}%`);
  if (descrizione?.trim()) query = query.ilike('descrizione', `%${descrizione.trim()}%`);
  if (supplier?.trim()) query = query.ilike('supplier', `%${supplier.trim()}%`);
  if (tipo?.trim()) query = query.eq('tipo_prodotto', tipo.trim());
  if (gene?.trim()) query = query.ilike('gene_symbol', `%${gene.trim()}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }
  next();
}

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('categories').insert(req.body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/suppliers', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('suppliers').upsert(req.body, { onConflict: 'nome' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/distributors', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('distributors').upsert(req.body, { onConflict: 'nome' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/brands', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('distributor_brands').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('products').insert(req.body).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── SPA fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TIGEM Acquisti Tool avviato su porta ${PORT}`));
