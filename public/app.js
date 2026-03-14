// ═══════════════════════════════════════════════════════════════════════════════
// TIGEM Acquisti Tool - Frontend
// ═══════════════════════════════════════════════════════════════════════════════

const $ = s => document.getElementById(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ── Navigation ─────────────────────────────────────────────────────────────
$$('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $$('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    $('page-' + page).classList.add('active');
    // Load data for the page if needed
    if (page === 'suppliers' && !suppLoaded) loadSuppliers();
    if (page === 'distributors' && !distLoaded) loadDistributorCards();
    if (page === 'categorie' && !catLoaded) loadCategoryTree();
  });
});

// Sidebar toggle
$('sidebar-toggle').addEventListener('click', () => {
  $('sidebar').classList.toggle('collapsed');
});

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(html) {
  $('modal-content').innerHTML = html;
  $('modal-overlay').classList.remove('hidden');
}
function closeModal() { $('modal-overlay').classList.add('hidden'); }
$('modal-close').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });

// ── Loading helpers ────────────────────────────────────────────────────────
function setLoading(btn, on) {
  const txt = btn.querySelector('.btn-text');
  const spin = btn.querySelector('.spinner');
  btn.disabled = on;
  if (txt) txt.classList.toggle('hidden', on);
  if (spin) spin.classList.toggle('hidden', !on);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

async function loadDashboard() {
  try {
    const [stats, dists] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/distributors').then(r => r.json())
    ]);

    $('stat-suppliers').textContent = stats.suppliers || '0';
    $('stat-distributors').textContent = stats.distributori || '0';
    $('stat-brands').textContent = stats.brand || '0';
    $('stat-categories').textContent = stats.categorie || '0';

    // Top distributors (load brand counts)
    const topDist = $('top-distributors');
    topDist.innerHTML = '';

    const distWithCounts = await Promise.all(
      dists.slice(0, 8).map(async d => {
        const r = await fetch('/api/distributors/' + encodeURIComponent(d.nome) + '/brands');
        const data = await r.json();
        return { nome: d.nome, count: (data.brands || []).length };
      })
    );

    distWithCounts.sort((a, b) => b.count - a.count);
    topDist.innerHTML = distWithCounts.map(d => `
      <div class="dash-list-item" onclick="navigateToDistributor('${esc(d.nome)}')">
        <span class="dash-list-name">${esc(d.nome)}</span>
        <span class="dash-list-count">${d.count} brand</span>
      </div>`).join('');
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

window.navigateToDistributor = function(nome) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $$('.page').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-page="distributors"]').classList.add('active');
  $('page-distributors').classList.add('active');
  if (!distLoaded) loadDistributorCards();
  $('dist-search').value = nome;
  setTimeout(() => filterDistCards(), 100);
};

// Dashboard quick search
$('dash-search-btn').addEventListener('click', dashQuickSearch);
$('dash-search').addEventListener('keydown', e => { if (e.key === 'Enter') dashQuickSearch(); });

async function dashQuickSearch() {
  const q = $('dash-search').value.trim();
  if (!q) return;
  const res = $('dash-search-results');
  res.innerHTML = '<div style="color:#94a3b8;padding:.5rem">Ricerca...</div>';

  try {
    const r = await fetch('/api/distributors/search?brand=' + encodeURIComponent(q));
    const data = await r.json();
    const items = data.trovati || [];

    if (!items.length) {
      res.innerHTML = `<div class="no-results" style="padding:1rem">Nessun risultato per "${esc(q)}"</div>`;
      return;
    }

    res.innerHTML = items.slice(0, 5).map(item => `
      <div class="dash-list-item" onclick="navigateToDistributor('${esc(item.distributore)}')">
        <span class="dash-list-name">${esc(item.distributore)}</span>
        <span class="tag tag-brand">${esc(item.brand)}</span>
      </div>`).join('');
  } catch {
    res.innerHTML = '<div class="error-box">Errore nella ricerca</div>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIE ALYANTE
// ═══════════════════════════════════════════════════════════════════════════════

let allCategories = [];
let catLoaded = false;

$('cat-btn').addEventListener('click', searchCategories);
$('cat-input').addEventListener('keydown', e => { if (e.key === 'Enter') searchCategories(); });

async function searchCategories() {
  const q = $('cat-input').value.trim();
  if (!q) return;
  const btn = $('cat-btn');
  setLoading(btn, true);
  $('cat-results').classList.add('hidden');
  $('cat-error').classList.add('hidden');

  try {
    const r = await fetch('/api/categories/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: q })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    const items = data.suggerimenti || [];
    if (!items.length) { $('cat-error').textContent = 'Nessun suggerimento trovato.'; $('cat-error').classList.remove('hidden'); return; }

    $('cat-results').innerHTML = items.map((s, i) => {
      const cls = s.confidenza >= 8 ? 'conf-high' : s.confidenza >= 5 ? 'conf-mid' : 'conf-low';
      const lbl = s.confidenza >= 8 ? 'Alta' : s.confidenza >= 5 ? 'Media' : 'Bassa';
      return `<div class="ai-card">
        <div class="ai-card-rank">${i + 1}</div>
        <div class="ai-card-body">
          <div><span class="ai-famiglia">${esc(s.famiglia)}</span><span class="ai-arrow"> &rsaquo; </span><span class="ai-sottofamiglia">${esc(s.sottofamiglia)}</span></div>
          ${s.spiegazione ? `<div class="ai-spiegazione">${esc(s.spiegazione)}</div>` : ''}
        </div>
        <div class="confidence-badge ${cls}">${lbl} (${s.confidenza}/10)</div>
      </div>`;
    }).join('');
    $('cat-results').classList.remove('hidden');
  } catch (err) {
    $('cat-error').textContent = err.message;
    $('cat-error').classList.remove('hidden');
  } finally { setLoading(btn, false); }
}

async function loadCategoryTree() {
  const tree = $('cat-tree');
  tree.innerHTML = '<div style="color:#94a3b8;padding:1rem">Caricamento...</div>';
  try {
    allCategories = await fetch('/api/categories').then(r => r.json());
    renderCatTree(allCategories);
    catLoaded = true;
  } catch { tree.innerHTML = '<div class="error-box">Errore caricamento</div>'; }
}

function renderCatTree(cats) {
  const tree = $('cat-tree');
  const groups = {};
  cats.forEach(c => {
    const k = `${c.numero}||${c.famiglia}`;
    if (!groups[k]) groups[k] = { numero: c.numero, famiglia: c.famiglia, subs: [] };
    groups[k].subs.push(c.sottofamiglia);
  });
  if (!Object.keys(groups).length) { tree.innerHTML = '<div class="no-results">Nessuna categoria</div>'; return; }
  tree.innerHTML = Object.values(groups).map(g => `
    <div class="cat-family">
      <div class="cat-family-header" onclick="this.nextElementSibling.classList.toggle('visible');this.querySelector('.cat-chevron').classList.toggle('open')">
        <span class="cat-num">${g.numero}</span>
        <span class="cat-name">${esc(g.famiglia)}</span>
        <span class="cat-chevron">&rsaquo;</span>
      </div>
      <div class="cat-subs">${g.subs.map(s => `<div class="cat-sub">${esc(s)}</div>`).join('')}</div>
    </div>`).join('');
}

$('cat-filter').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  if (!q) { renderCatTree(allCategories); return; }
  renderCatTree(allCategories.filter(c => c.famiglia.toLowerCase().includes(q) || c.sottofamiglia.toLowerCase().includes(q)));
  setTimeout(() => { $$('.cat-subs').forEach(s => s.classList.add('visible')); $$('.cat-chevron').forEach(c => c.classList.add('open')); }, 10);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALTERNATIVE HUNTER
// ═══════════════════════════════════════════════════════════════════════════════

$('alt-btn').addEventListener('click', searchAlternatives);
$('alt-input').addEventListener('keydown', e => { if (e.key === 'Enter') searchAlternatives(); });

async function searchAlternatives() {
  const q = $('alt-input').value.trim();
  if (!q) return;
  setLoading($('alt-btn'), true);
  $('alt-results').classList.add('hidden');
  $('alt-error').classList.add('hidden');

  try {
    const r = await fetch('/api/alternative-hunter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: q })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    let html = '';

    if (data.tipo === 'trovato' && data.distributori?.length) {
      html += `<h3 style="margin-bottom:1rem">Distributori per <strong>${esc(data.brand)}</strong></h3>`;
      html += data.distributori.map(d => {
        const c = d.condizioni;
        return `<div class="result-card">
          <div class="result-header">
            <div class="result-name">${esc(d.distributore)}</div>
            <span class="tag ${d.esclusiva ? 'tag-exc' : 'tag-no-exc'}">${d.esclusiva ? 'Esclusiva' : 'Non esclusiva'}</span>
            ${d.is_attuale ? '<span class="tag tag-current">Attuale</span>' : ''}
          </div>
          ${c ? `<div class="result-body">
            <div class="cond-item"><div class="cond-label">Ordine minimo</div><div class="cond-value">${esc(c.min_ordine || '—')}</div></div>
            <div class="cond-item"><div class="cond-label">Spese spedizione</div><div class="cond-value">${esc(c.spese_spedizione || '—')}</div></div>
            <div class="cond-item"><div class="cond-label">Ghiaccio secco</div><div class="cond-value">${esc(c.spese_ghiaccio_secco || '—')}</div></div>
          </div>` : ''}
        </div>`;
      }).join('');
    } else if (data.tipo === 'ai_alternative' && data.alternative?.length) {
      html += `<div class="fuzzy-note">Brand non trovato nel database. Ecco alternative suggerite dall'AI:</div>`;
      html += data.alternative.map(a => `
        <div class="result-card">
          <div class="result-header">
            <div class="result-name">${esc(a.brand)}</div>
          </div>
          <div class="result-body"><div class="cond-value">${esc(a.motivo)}</div></div>
        </div>`).join('');
    } else {
      html = '<div class="no-results">Nessun risultato trovato</div>';
    }

    $('alt-results').innerHTML = html;
    $('alt-results').classList.remove('hidden');
  } catch (err) {
    $('alt-error').textContent = err.message;
    $('alt-error').classList.remove('hidden');
  } finally { setLoading($('alt-btn'), false); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

let allSuppliers = [];
let suppLoaded = false;

async function loadSuppliers() {
  const grid = $('supp-grid');
  grid.innerHTML = '<div style="color:#94a3b8;padding:2rem;text-align:center">Caricamento suppliers...</div>';
  try {
    allSuppliers = await fetch('/api/suppliers').then(r => r.json());
    renderSupplierGrid(allSuppliers);
    suppLoaded = true;
  } catch { grid.innerHTML = '<div class="error-box">Errore caricamento</div>'; }
}

function renderSupplierGrid(items) {
  const grid = $('supp-grid');
  if (!items.length) { grid.innerHTML = '<div class="no-results">Nessun supplier trovato</div>'; return; }
  grid.innerHTML = items.map(s => `
    <div class="catalog-card" onclick="openSupplierDetail('${esc(s.nome)}')">
      <div class="catalog-card-name">${esc(s.nome)}</div>
      ${s.paese ? `<div class="catalog-card-country">${esc(s.paese)}</div>` : ''}
      ${s.descrizione ? `<div class="catalog-card-desc">${esc(s.descrizione)}</div>` : ''}
    </div>`).join('');
}

$('supp-search-btn').addEventListener('click', filterSuppliers);
$('supp-search').addEventListener('keydown', e => { if (e.key === 'Enter') filterSuppliers(); });
$('supp-search').addEventListener('input', filterSuppliers);

function filterSuppliers() {
  const q = $('supp-search').value.toLowerCase().trim();
  if (!q) { renderSupplierGrid(allSuppliers); return; }
  renderSupplierGrid(allSuppliers.filter(s => s.nome.toLowerCase().includes(q) || (s.descrizione || '').toLowerCase().includes(q)));
}

window.openSupplierDetail = async function(nome) {
  openModal('<div style="color:#94a3b8;padding:2rem;text-align:center">Caricamento...</div>');
  try {
    const data = await fetch('/api/suppliers/' + encodeURIComponent(nome)).then(r => r.json());
    const s = data.supplier;
    const dists = data.distributori || [];

    let html = `<h2>${esc(s.nome)}</h2>`;
    if (s.paese) html += `<div class="modal-subtitle">${esc(s.paese)}${s.sito_web ? ' &middot; ' + esc(s.sito_web) : ''}</div>`;
    if (s.descrizione) html += `<p style="color:#475569;font-size:.9rem;margin-bottom:1.25rem">${esc(s.descrizione)}</p>`;

    if (dists.length) {
      html += `<div class="modal-section"><div class="modal-section-title">Distributori in Italia</div>`;
      html += dists.map(d => {
        const c = d.condizioni;
        return `<div class="result-card" style="margin-bottom:.75rem">
          <div class="result-header">
            <div class="result-name">${esc(d.distributore)}</div>
            <span class="tag ${d.esclusiva ? 'tag-exc' : 'tag-no-exc'}">${d.esclusiva ? 'Esclusiva' : 'Non esclusiva'}</span>
          </div>
          ${c ? `<div class="result-body">
            <div class="cond-item"><div class="cond-label">Min. ordine</div><div class="cond-value">${esc(c.min_ordine || '—')}</div></div>
            <div class="cond-item"><div class="cond-label">Spedizione</div><div class="cond-value">${esc(c.spese_spedizione || '—')}</div></div>
            <div class="cond-item"><div class="cond-label">Ghiaccio secco</div><div class="cond-value">${esc(c.spese_ghiaccio_secco || '—')}</div></div>
          </div>` : ''}
        </div>`;
      }).join('');
      html += '</div>';
    } else {
      html += '<div style="color:#94a3b8;font-size:.9rem;margin-top:1rem">Nessun distributore registrato per questo supplier.</div>';
    }

    $('modal-content').innerHTML = html;
  } catch { $('modal-content').innerHTML = '<div class="error-box">Errore caricamento dettagli</div>'; }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTORS CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

let allDistributors = [];
let distLoaded = false;

async function loadDistributorCards() {
  const grid = $('dist-grid');
  grid.innerHTML = '<div style="color:#94a3b8;padding:2rem;text-align:center">Caricamento distributori...</div>';
  try {
    allDistributors = await fetch('/api/distributors').then(r => r.json());
    renderDistGrid(allDistributors);
    distLoaded = true;
  } catch { grid.innerHTML = '<div class="error-box">Errore caricamento</div>'; }
}

function renderDistGrid(items) {
  const grid = $('dist-grid');
  if (!items.length) { grid.innerHTML = '<div class="no-results">Nessun distributore trovato</div>'; return; }
  grid.innerHTML = items.map(d => `
    <div class="catalog-card" onclick="openDistDetail('${esc(d.nome)}')">
      <div class="catalog-card-name">${esc(d.nome)}</div>
      ${d.paese ? `<div class="catalog-card-country">${esc(d.paese)}</div>` : '<div class="catalog-card-country">Italia</div>'}
      <div class="catalog-card-badge badge-blue">Distributore</div>
    </div>`).join('');
}

$('dist-search-btn').addEventListener('click', filterDistCards);
$('dist-search').addEventListener('keydown', e => { if (e.key === 'Enter') filterDistCards(); });
$('dist-search').addEventListener('input', filterDistCards);

function filterDistCards() {
  const q = $('dist-search').value.toLowerCase().trim();
  if (!q) { renderDistGrid(allDistributors); return; }
  renderDistGrid(allDistributors.filter(d => d.nome.toLowerCase().includes(q)));
}

window.openDistDetail = async function(nome) {
  openModal('<div style="color:#94a3b8;padding:2rem;text-align:center">Caricamento...</div>');
  try {
    const data = await fetch('/api/distributors/' + encodeURIComponent(nome) + '/brands').then(r => r.json());
    const c = data.condizioni;
    const brands = data.brands || [];

    let html = `<h2>${esc(c?.nome || nome)}</h2>`;
    if (c?.paese) html += `<div class="modal-subtitle">${esc(c.paese)}</div>`;

    if (c) {
      html += `<div class="modal-section"><div class="modal-section-title">Condizioni di acquisto</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem">
          <div class="cond-item"><div class="cond-label">Ordine minimo</div><div class="cond-value">${esc(c.min_ordine || '—')}</div></div>
          <div class="cond-item"><div class="cond-label">Spese spedizione</div><div class="cond-value">${esc(c.spese_spedizione || '—')}</div></div>
          <div class="cond-item"><div class="cond-label">Ghiaccio secco</div><div class="cond-value">${esc(c.spese_ghiaccio_secco || '—')}</div></div>
          ${c.note ? `<div class="cond-item" style="grid-column:1/-1"><div class="cond-label">Note</div><div class="cond-value">${esc(c.note)}</div></div>` : ''}
        </div>
      </div>`;
    }

    if (brands.length) {
      const exc = brands.filter(b => b.esclusiva);
      const noExc = brands.filter(b => !b.esclusiva);
      html += `<div class="modal-section"><div class="modal-section-title">Brand distribuiti (${brands.length})</div>`;
      if (exc.length) {
        html += `<div style="margin-bottom:.75rem"><strong style="font-size:.82rem;color:#16a34a">Esclusiva (${exc.length})</strong>
          <div class="brands-grid">${exc.map(b => `<span class="brand-chip exc">${esc(b.brand)}</span>`).join('')}</div></div>`;
      }
      if (noExc.length) {
        html += `<div><strong style="font-size:.82rem;color:#64748b">Non esclusiva (${noExc.length})</strong>
          <div class="brands-grid">${noExc.map(b => `<span class="brand-chip no-exc">${esc(b.brand)}</span>`).join('')}</div></div>`;
      }
      html += '</div>';
    }

    $('modal-content').innerHTML = html;
  } catch { $('modal-content').innerHTML = '<div class="error-box">Errore caricamento</div>'; }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

$('prod-btn').addEventListener('click', searchProducts);

async function searchProducts() {
  const params = new URLSearchParams();
  const code = $('prod-code').value.trim();
  const desc = $('prod-desc').value.trim();
  const supp = $('prod-supplier').value.trim();
  const gene = $('prod-gene').value.trim();
  const tipo = $('prod-type').value;

  if (code) params.set('codice', code);
  if (desc) params.set('descrizione', desc);
  if (supp) params.set('supplier', supp);
  if (gene) params.set('gene', gene);
  if (tipo) params.set('tipo', tipo);

  const res = $('prod-results');
  res.innerHTML = '<div style="color:#94a3b8;padding:2rem;text-align:center">Ricerca...</div>';

  try {
    const data = await fetch('/api/products?' + params.toString()).then(r => r.json());
    if (!data.length) {
      res.innerHTML = '<div class="no-results">Nessun prodotto trovato. La sezione prodotti verra popolata man mano che aggiungi dati.</div>';
      return;
    }
    res.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.88rem">
      <thead><tr style="background:var(--gray-100);text-align:left">
        <th style="padding:.6rem .75rem">Codice</th>
        <th style="padding:.6rem .75rem">Descrizione</th>
        <th style="padding:.6rem .75rem">Supplier</th>
        <th style="padding:.6rem .75rem">Tipo</th>
        <th style="padding:.6rem .75rem">Gene</th>
      </tr></thead>
      <tbody>${data.map(p => `<tr style="border-bottom:1px solid var(--gray-100)">
        <td style="padding:.5rem .75rem;font-weight:600">${esc(p.codice || '—')}</td>
        <td style="padding:.5rem .75rem">${esc(p.descrizione)}</td>
        <td style="padding:.5rem .75rem">${esc(p.supplier || '—')}</td>
        <td style="padding:.5rem .75rem">${esc(p.tipo_prodotto || '—')}</td>
        <td style="padding:.5rem .75rem">${esc(p.gene_symbol || '—')}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch { res.innerHTML = '<div class="error-box">Errore nella ricerca</div>'; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

loadDashboard();
loadCategoryTree();
