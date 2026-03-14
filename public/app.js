// TIGEM Acquisti Tool - Frontend
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

// ── Category Matcher (AI) ──
async function matchCategory() {
  const desc = $('cat-input').value.trim();
  if (!desc) return;

  const btn = $('cat-btn');
  btn.disabled = true;
  $('cat-results').innerHTML = '<div class="loading">Analisi AI in corso...</div>';

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

    const html = (data.suggerimenti || []).map(s => {
      const confClass = s.confidenza >= 8 ? 'conf-high' : s.confidenza >= 5 ? 'conf-med' : 'conf-low';
      return `<div class="ai-card">
        <div class="famiglia">${s.famiglia}</div>
        <div class="sottofamiglia">${s.sottofamiglia}</div>
        <div class="spiegazione">${s.spiegazione || ''}</div>
        <span class="confidenza ${confClass}">Confidenza: ${s.confidenza}/10</span>
      </div>`;
    }).join('');

    $('cat-results').innerHTML = html || '<div class="empty-state">Nessun suggerimento trovato</div>';
  } catch (err) {
    $('cat-results').innerHTML = `<div class="ai-card" style="border-color:var(--danger)"><p>Errore: ${err.message}</p></div>`;
  } finally {
    btn.disabled = false;
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
          <span>${famiglia}</span>
          <span class="badge">${items.length}</span>
        </div>
        <div class="cat-items">
          ${items.map(i => `<div class="cat-item">${i.sottofamiglia}</div>`).join('')}
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

// ── Brand Search ──
async function searchBrand() {
  const q = $('brand-input').value.trim();
  if (!q) return;

  $('brand-results').innerHTML = '<div class="loading">Cercando...</div>';

  try {
    const resp = await fetch(`/api/brands/search?q=${encodeURIComponent(q)}`);
    const data = await resp.json();

    if (!data.trovati?.length) {
      $('brand-results').innerHTML = `<div class="empty-state">Nessun distributore trovato per "${q}".<br>Prova con Alternative Hunter!</div>`;
      return;
    }

    $('brand-results').innerHTML = data.trovati.map(r => `
      <div class="brand-result">
        <h3><span class="brand-name">${r.brand}</span> ${r.esclusiva ? '<span class="badge-escl">ESCLUSIVA</span>' : '<span class="badge-non-escl">non esclusiva</span>'}</h3>
        <div class="dist-name">Distributore: <strong>${r.distributore}</strong></div>
        ${r.condizioni ? `<div class="cond" style="margin-top:0.5rem;font-size:0.85rem">
          Min. ordine: ${r.condizioni.min_ordine} | Spedizione: ${r.condizioni.spese_spedizione} | Ghiaccio: ${r.condizioni.spese_ghiaccio_secco}
        </div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    $('brand-results').innerHTML = `<div class="empty-state">Errore: ${err.message}</div>`;
  }
}

$('brand-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchBrand(); });

// ── Alternative Hunter ──
async function findAlternatives() {
  const brand = $('alt-input').value.trim();
  if (!brand) return;

  $('alt-results').innerHTML = '<div class="loading">Cercando alternative...</div>';

  try {
    const resp = await fetch('/api/alternative-hunter', {
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
    } else if (data.tipo === 'ai_alternative' && data.alternative?.length) {
      let html = `<h3 style="margin-bottom:1rem">Brand "${brand}" non trovato. Suggerimenti AI:</h3>`;
      html += data.alternative.map(a => `
        <div class="ai-card">
          <div class="famiglia">${a.brand}</div>
          <div class="spiegazione">${a.motivo}</div>
        </div>
      `).join('');
      $('alt-results').innerHTML = html;
    } else {
      $('alt-results').innerHTML = '<div class="empty-state">Nessun risultato trovato.</div>';
    }
  } catch (err) {
    $('alt-results').innerHTML = `<div class="empty-state">Errore: ${err.message}</div>`;
  }
}

$('alt-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') findAlternatives(); });

// ── Init ──
loadCategoryTree();
loadDistributors();
