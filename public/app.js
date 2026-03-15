// Fondazione Telethon - Tool Acquisti - Frontend
const $ = id => document.getElementById(id);

// ── Navigation ──
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    $('page-' + page).classList.add('active');
  });
});

// ── Modal ──
function openModal(html) {
  $('modal-body').innerHTML = html;
  $('modal').classList.add('open');
}
function closeModal() {
  $('modal').classList.remove('open');
}

// ── Quick Search Tags per Categorie ──
function quickSearch(term) {
  $('cat-input').value = term;
  matchCategory();
}

// ── Category Matcher — Ricerca intelligente ──
async function matchCategory() {
  const desc = $('cat-input').value.trim();
  if (!desc) return;

  const btn = $('cat-btn');
  btn.disabled = true;
  btn.textContent = 'Ricerca in corso...';
  $('cat-results').innerHTML = `
    <div class="loading">
      <div class="search-progress">
        <div class="progress-step active" id="step-db">🔍 Analisi nel database interno...</div>
        <div class="progress-step" id="step-pubchem">🧪 Ricerca su PubChem...</div>
        <div class="progress-step" id="step-uniprot">🧬 Ricerca su UniProt...</div>
        <div class="progress-step" id="step-pmc">📚 Ricerca letteratura scientifica...</div>
      </div>
    </div>`;

  // Anima i passi
  setTimeout(() => { const el = $('step-pubchem'); if (el) el.classList.add('active'); }, 400);
  setTimeout(() => { const el = $('step-uniprot'); if (el) el.classList.add('active'); }, 1200);
  setTimeout(() => { const el = $('step-pmc'); if (el) el.classList.add('active'); }, 2000);

  try {
    const resp = await fetch('/api/categories/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: desc })
    });
    const data = await resp.json();

    if (data.error) {
      $('cat-results').innerHTML = `<div class="ai-card" style="border-color:var(--danger)"><p>${data.error}</p></div>`;
      return;
    }

    // Mostra fonti di ricerca
    let fontiHtml = '';
    if (data.fonti?.length) {
      fontiHtml = `<div class="search-sources">
        <strong>📡 Fonti:</strong> ${data.fonti.join(' • ')}
        ${data.tempo ? `<span class="search-time">(${data.tempo}ms)</span>` : ''}
      </div>`;
    }

    // Mostra info prodotto se identificato
    let productHtml = '';
    if (data.productInfo) {
      productHtml = `<div class="product-info-card">
        <div class="product-name">🔬 Prodotto identificato: <strong>${data.productInfo.name}</strong></div>
        <div class="product-source">Fonte: ${data.productInfo.source}</div>
        ${data.productInfo.descriptions?.[0] ? `<div class="product-desc">${data.productInfo.descriptions[0].substring(0, 250)}${data.productInfo.descriptions[0].length > 250 ? '...' : ''}</div>` : ''}
        ${data.productInfo.synonyms?.length ? `<div class="product-synonyms">Sinonimi: ${data.productInfo.synonyms.slice(0, 5).join(', ')}</div>` : ''}
      </div>`;
    }

    const cardsHtml = (data.suggerimenti || []).map((s, i) => {
      const confClass = s.confidenza >= 8 ? 'conf-high' : s.confidenza >= 5 ? 'conf-med' : 'conf-low';
      const isTop = i === 0 ? ' top-result' : '';
      return `<div class="ai-card${isTop}">
        <div class="card-header">
          <div class="famiglia">${s.codice ? `<span class="codice-badge">${s.codice}</span> ` : ''}${s.famiglia}</div>
          <span class="confidenza ${confClass}">${s.confidenza}/10</span>
        </div>
        <div class="sottofamiglia">${s.sottofamiglia}</div>
        <div class="spiegazione">${s.spiegazione || ''}</div>
      </div>`;
    }).join('');

    $('cat-results').innerHTML = fontiHtml + productHtml + (cardsHtml || '<div class="empty-state">Nessun suggerimento trovato. Prova con un nome prodotto o codice diverso.</div>');
  } catch (err) {
    $('cat-results').innerHTML = `<div class="ai-card" style="border-color:var(--danger)"><p>Errore: ${err.message}</p></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cerca categoria';
  }
}

// Enter key on category input
$('cat-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') matchCategory(); });

// ── Category Tree ──
async function loadCategoryTree() {
  try {
    const resp = await fetch('/api/categories');
    const cats = await resp.json();

    const grouped = {};
    cats.forEach(c => {
      if (!grouped[c.famiglia]) grouped[c.famiglia] = [];
      grouped[c.famiglia].push(c);
    });

    let html = '';
    for (const [famiglia, items] of Object.entries(grouped)) {
      html += `<div class="cat-family">
        <div class="cat-family-header" onclick="this.nextElementSibling.classList.toggle('open')">
          <span>${items[0]?.codice?.split('.')[0] || ''} - ${famiglia}</span>
          <span class="badge">${items.length}</span>
        </div>
        <div class="cat-items">
          ${items.map(i => `<div class="cat-item"><strong>${i.codice}</strong> — ${i.sottofamiglia}</div>`).join('')}
        </div>
      </div>`;
    }
    $('cat-tree').innerHTML = html;
  } catch (err) {
    $('cat-tree').innerHTML = '<div class="empty-state">Errore caricamento categorie</div>';
  }
}

// ── Distributors ──
let allDistributors = [];

async function loadDistributors() {
  try {
    const resp = await fetch('/api/distributors');
    allDistributors = await resp.json();
    renderDistributors(allDistributors);
  } catch (err) {
    $('dist-list').innerHTML = '<div class="empty-state">Errore caricamento</div>';
  }
}

function filterDistributors() {
  const q = $('dist-input').value.toLowerCase();
  const filtered = q ? allDistributors.filter(d => d.nome.toLowerCase().includes(q)) : allDistributors;
  renderDistributors(filtered);
}

function renderDistributors(dists) {
  $('dist-list').innerHTML = dists.map(d => `
    <div class="dist-card" onclick="showDistributor('${encodeURIComponent(d.nome)}')">
      <h3>${d.nome}</h3>
      <div class="cond">
        <strong>Min. ordine:</strong> ${d.min_ordine}<br>
        <strong>Spedizione:</strong> ${d.spese_spedizione}<br>
        <strong>Ghiaccio secco:</strong> ${d.spese_ghiaccio_secco}
      </div>
    </div>
  `).join('');
}

async function showDistributor(nome) {
  nome = decodeURIComponent(nome);
  try {
    const resp = await fetch(`/api/distributors/${encodeURIComponent(nome)}/brands`);
    const data = await resp.json();

    let html = `<h2>${nome}</h2>`;

    if (data.condizioni) {
      html += `<table>
        <tr><th>Min. ordine</th><td>${data.condizioni.min_ordine}</td></tr>
        <tr><th>Spese spedizione</th><td>${data.condizioni.spese_spedizione}</td></tr>
        <tr><th>Ghiaccio secco</th><td>${data.condizioni.spese_ghiaccio_secco}</td></tr>
      </table>`;
    }

    if (data.brands?.length) {
      const exclusive = data.brands.filter(b => b.esclusiva);
      const nonExcl = data.brands.filter(b => !b.esclusiva);

      if (exclusive.length) {
        html += `<h3 style="margin-top:1rem;color:var(--accent)">Brand in esclusiva (${exclusive.length})</h3>`;
        html += exclusive.map(b => `<span class="badge-escl" style="margin:0.2rem">${b.brand}</span>`).join(' ');
      }
      if (nonExcl.length) {
        html += `<h3 style="margin-top:1rem;color:var(--text-light)">Brand non esclusivi (${nonExcl.length})</h3>`;
        html += nonExcl.map(b => `<span class="badge-non-escl" style="margin:0.2rem">${b.brand}</span>`).join(' ');
      }
    } else {
      html += '<p style="color:var(--text-light);margin-top:1rem">Nessun brand mappato per questo distributore.</p>';
    }

    openModal(html);
  } catch (err) {
    openModal(`<h2>${nome}</h2><p>Errore: ${err.message}</p>`);
  }
}

// ── Global Brand Search ──
let allGlobalBrands = [];
let activeFilter = '';

async function loadGlobalBrands() {
  try {
    const resp = await fetch('/api/global-brands');
    allGlobalBrands = await resp.json();

    // Build category filters
    const cats = [...new Set(allGlobalBrands.map(b => b.category))].sort();
    $('brand-filters').innerHTML = `<button class="brand-filter active" onclick="filterBrandCat('')">Tutti</button>` +
      cats.map(c => `<button class="brand-filter" onclick="filterBrandCat('${c}')">${c}</button>`).join('');

    $('brand-stats').innerHTML = `<strong>${allGlobalBrands.length}</strong> brand nel database`;
    renderGlobalBrands(allGlobalBrands);
  } catch (err) {
    $('brand-results').innerHTML = '<div class="empty-state">Errore caricamento brand</div>';
  }
}

function filterBrandCat(cat) {
  activeFilter = cat;
  document.querySelectorAll('.brand-filter').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  searchGlobalBrands();
}

function searchGlobalBrands() {
  const q = ($('brand-input')?.value || '').toLowerCase().trim();
  let filtered = allGlobalBrands;

  if (activeFilter) {
    filtered = filtered.filter(b => b.category === activeFilter);
  }
  if (q) {
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  }

  $('brand-stats').innerHTML = `<strong>${filtered.length}</strong> brand${activeFilter ? ` in "${activeFilter}"` : ''}${q ? ` per "${q}"` : ''}`;
  renderGlobalBrands(filtered);
}

function renderGlobalBrands(brands) {
  if (!brands.length) {
    $('brand-results').innerHTML = '<div class="empty-state">Nessun brand trovato. Prova con un termine diverso.</div>';
    return;
  }

  $('brand-results').innerHTML = brands.slice(0, 100).map(b => {
    const distHtml = b.distributoriIT?.length
      ? b.distributoriIT.map(d => `<span class="brand-dist-info">${d.distributore}${d.esclusiva ? ' ★' : ''}</span>`).join(', ')
      : '<span class="brand-dist-info no-dist">Nessun distributore IT mappato</span>';

    return `<div class="global-brand-card">
      <div class="brand-main">
        <h3>${b.name}</h3>
        <div><span class="brand-cat-tag">${b.category}</span><span class="brand-country">${b.country || ''}</span></div>
        <div class="brand-desc">${b.description}</div>
      </div>
      <div class="brand-right">
        ${b.website ? `<a href="${b.website}" target="_blank">🔗 Sito web</a><br>` : ''}
        ${distHtml}
      </div>
    </div>`;
  }).join('');

  if (brands.length > 100) {
    $('brand-results').innerHTML += `<div class="empty-state" style="padding:1rem">Mostrati 100 di ${brands.length} risultati. Affina la ricerca.</div>`;
  }
}

// ── Cerca Distributore ──
async function cercaDistributore() {
  const brand = $('alt-input').value.trim();
  if (!brand) return;

  $('alt-results').innerHTML = '<div class="loading">Cercando distributori...</div>';

  try {
    const resp = await fetch('/api/cerca-distributore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand })
    });
    const data = await resp.json();

    if (data.tipo === 'trovato' && data.distributori?.length) {
      let html = `<h3 style="margin-bottom:1rem">Distributori per: <strong>${data.brand}</strong></h3>`;
      html += data.distributori.map(d => `
        <div class="brand-result">
          <h3>${d.distributore} ${d.esclusiva ? '<span class="badge-escl">ESCLUSIVA</span>' : '<span class="badge-non-escl">non esclusiva</span>'}</h3>
          ${d.condizioni ? `<div class="cond" style="font-size:0.85rem">
            Min. ordine: ${d.condizioni.min_ordine} | Spedizione: ${d.condizioni.spese_spedizione} | Ghiaccio: ${d.condizioni.spese_ghiaccio_secco}
          </div>` : ''}
        </div>
      `).join('');
      $('alt-results').innerHTML = html;
    } else {
      $('alt-results').innerHTML = `<div class="empty-state">Nessun distributore trovato per "${brand}".<br>Verifica il nome del brand e riprova.</div>`;
    }
  } catch (err) {
    $('alt-results').innerHTML = `<div class="empty-state">Errore: ${err.message}</div>`;
  }
}

$('alt-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') cercaDistributore(); });

// ── Init ──
loadCategoryTree();
loadDistributors();
loadGlobalBrands();
