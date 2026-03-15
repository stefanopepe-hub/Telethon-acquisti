const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP HELPER — per chiamate API esterne
// ═══════════════════════════════════════════════════════════════════════════════

function httpGet(url, timeout = 8000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout, headers: { 'User-Agent': 'TIGEM-Acquisti/1.0', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RICERCA SCIENTIFICA — PubChem, UniProt, Europe PMC
// ═══════════════════════════════════════════════════════════════════════════════

// PubChem: identifica composti chimici, farmaci, inibitori, reagenti
async function searchPubChem(query) {
  try {
    // 1. Cerca composto per nome
    const desc = await httpGet(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/description/JSON`);
    if (desc?.InformationList?.Information?.length) {
      const info = desc.InformationList.Information;
      const descriptions = info.map(i => i.Description).filter(Boolean);
      const title = info[0]?.Title || query;
      const cid = info[0]?.CID;

      // Prendi anche sinonimi per miglior classificazione
      let synonyms = [];
      if (cid) {
        const synData = await httpGet(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`);
        synonyms = synData?.InformationList?.Information?.[0]?.Synonym?.slice(0, 10) || [];
      }

      return {
        found: true,
        source: 'PubChem',
        name: title,
        cid,
        descriptions: descriptions.slice(0, 3),
        synonyms,
        fullText: descriptions.join(' ') + ' ' + synonyms.join(' ')
      };
    }
  } catch(e) {}

  // 2. Prova autocomplete
  try {
    const auto = await httpGet(`https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(query)}/json?limit=5`);
    if (auto?.dictionary_terms?.compound?.length) {
      // Cerca il primo risultato completo
      const firstName = auto.dictionary_terms.compound[0];
      const desc2 = await httpGet(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(firstName)}/description/JSON`);
      if (desc2?.InformationList?.Information?.length) {
        const info = desc2.InformationList.Information;
        const descriptions = info.map(i => i.Description).filter(Boolean);
        return {
          found: true,
          source: 'PubChem',
          name: firstName,
          descriptions: descriptions.slice(0, 3),
          synonyms: auto.dictionary_terms.compound,
          fullText: descriptions.join(' ') + ' ' + auto.dictionary_terms.compound.join(' ')
        };
      }
      return {
        found: true,
        source: 'PubChem (autocomplete)',
        name: firstName,
        descriptions: [],
        synonyms: auto.dictionary_terms.compound,
        fullText: auto.dictionary_terms.compound.join(' ')
      };
    }
  } catch(e) {}

  return { found: false };
}

// UniProt: identifica proteine e geni
async function searchUniProt(query) {
  try {
    const data = await httpGet(`https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&size=3&format=json&fields=protein_name,organism_name,gene_names,cc_function`);
    if (data?.results?.length) {
      const results = data.results.map(r => ({
        name: r.proteinDescription?.recommendedName?.fullName?.value ||
              r.proteinDescription?.submissionNames?.[0]?.fullName?.value || query,
        organism: r.organism?.scientificName || '',
        genes: r.genes?.map(g => g.geneName?.value).filter(Boolean) || [],
        function: r.comments?.find(c => c.commentType === 'FUNCTION')?.texts?.[0]?.value || ''
      }));
      return {
        found: true,
        source: 'UniProt',
        results,
        fullText: results.map(r => `${r.name} ${r.organism} ${r.genes.join(' ')} ${r.function}`).join(' ')
      };
    }
  } catch(e) {}
  return { found: false };
}

// Europe PMC: cerca pubblicazioni scientifiche menzionanti il prodotto
async function searchEuropePMC(query) {
  try {
    const data = await httpGet(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&resultType=core&pageSize=3&format=json`);
    if (data?.resultList?.result?.length) {
      const articles = data.resultList.result;
      const abstracts = articles.map(a => a.abstractText || '').filter(Boolean);
      const titles = articles.map(a => a.title || '').filter(Boolean);
      return {
        found: true,
        source: 'Europe PMC',
        articles: articles.map(a => ({ title: a.title, journal: a.journalTitle })),
        fullText: titles.join(' ') + ' ' + abstracts.join(' ')
      };
    }
  } catch(e) {}
  return { found: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATORE INTELLIGENTE — analizza testo scientifico → categoria Alyante
// ═══════════════════════════════════════════════════════════════════════════════

const productClassificationRules = [
  // Anticorpi
  { pattern: /\b(antibod|anticorp|immunoglobulin|monoclonal|polyclonal|anti-\w+|IgG|IgM|IgA)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'ANTICORPI - WB (Western Blot)', confidence: 8, label: 'Anticorpo' },
  // Inibitori / composti chimici
  { pattern: /\b(inhibitor|inibitore|antagonist|agonist|modulator|blocker|activator|compound|small molecule)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'CHEMICALS - POLVERI', confidence: 8, label: 'Composto chimico / Inibitore' },
  // Enzimi (priorità alta — match diretto su nome prodotto)
  { pattern: /\b(enzyme|enzima|polymerase|ligase|kinase|phosphatase|protease|nuclease|recombinase|transferase|helicase|dnase|rnase|deoxyribonuclease|ribonuclease|endonuclease|exonuclease|topoisomerase|reverse transcriptase|caspase|collagenase|trypsin|dispase|luciferase)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'ENZIMI: restrizione, modifica (Molecular Biology)', confidence: 9, label: 'Enzima' },
  // Kit
  { pattern: /\b(kit|assay kit|detection kit|extraction kit|purification kit|isolation kit|elisa)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'KIT: estrazione, purificazione, luciferase assay, kit vitalita, ELISA, enrichment, depletion', confidence: 8, label: 'Kit' },
  // Citochine / growth factors
  { pattern: /\b(cytokine|citochin|growth factor|interleukin|chemokine|interferon|tnf|vegf|egf|fgf|bmp|tgf|pdgf)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'CITOCHINE', confidence: 8, label: 'Citochina / Fattore di crescita' },
  // siRNA / oligo / primers
  { pattern: /\b(siRNA|shRNA|miRNA|oligonucleotide|primer|probe|antisense|morpholino|gRNA|sgRNA|crRNA)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'OLIGO', confidence: 8, label: 'Oligonucleotide' },
  // Trasfezione
  { pattern: /\b(transfection|lipofect|electroporation|nucleofection|transduction|viral vector|lentivir|adenovir|AAV)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'TRASFEZIONE', confidence: 8, label: 'Reagente di trasfezione' },
  // Terreni di coltura
  { pattern: /\b(culture media|medium|DMEM|RPMI|MEM|cell culture|serum.free)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'TERRENI: DMEM, RPMI, Alpha MEM, MEM, Iscove\'s', confidence: 7, label: 'Terreno di coltura' },
  // Sieri
  { pattern: /\b(serum|siero|FBS|FCS|fetal bovine)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'SIERI: FBS, FCS, dializzati, horse', confidence: 8, label: 'Siero' },
  // PCR / qPCR
  { pattern: /\b(PCR|qPCR|real.time|taqman|sybr|mastermix|amplification)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'PCR: taq, dye, agarosio, DNA/RNA marker', confidence: 7, label: 'Reagente PCR' },
  // NGS
  { pattern: /\b(NGS|next.gen|sequencing library|library prep|illumina kit|nextera|10x genomics)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'NGS: preparazione librerie, purificazione, frammentazione', confidence: 8, label: 'Reagente NGS' },
  // Clonaggio
  { pattern: /\b(cloning|clonagg|competent cell|plasmid|vector|gateway|gibson assembly|ligation)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'CLONING: cellule competenti, kit clonaggio', confidence: 7, label: 'Reagente clonaggio' },
  // Chimica generica (solventi)
  { pattern: /\b(solvent|solvent|methanol|ethanol|acetone|DMSO|chloroform|buffer|solution)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'CHEMICALS - SOLVENTI', confidence: 6, label: 'Solvente / Buffer' },
  // Reagente chimico generico (fallback per PubChem compounds)
  { pattern: /\b(chemical|reagent|compound|molecule|drug|pharmaceutical|pharmacolog)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'CHEMICALS - POLVERI', confidence: 6, label: 'Reagente chimico' },
  // Animali
  { pattern: /\b(mouse|mice|rat|animal model|in.vivo|xenograft|transgenic)\b/i,
    famiglia: 'Animal Housing', sottofamiglia: 'Acquisto animali', confidence: 6, label: 'Modello animale' },
  // Coloranti / fluorescenti
  { pattern: /\b(dye|stain|fluorescen|fluorophore|chromogen|label|conjugat)\b/i,
    famiglia: 'Lab Reagents', sottofamiglia: 'CHEMICALS - POLVERI', confidence: 6, label: 'Colorante / Fluoroforo' },
];

function classifyFromText(text) {
  if (!text) return [];
  const results = [];

  for (const rule of productClassificationRules) {
    const match = text.match(rule.pattern);
    if (match) {
      results.push({
        famiglia: rule.famiglia,
        sottofamiglia: rule.sottofamiglia,
        confidenza: rule.confidence,
        label: rule.label,
        matchedTerm: match[0]
      });
    }
  }

  // Deduplica per sottofamiglia
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.famiglia}|${r.sottofamiglia}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTORE DI RICERCA COMPLETO: keyword + web APIs
// ═══════════════════════════════════════════════════════════════════════════════

// Valida se il risultato PubChem corrisponde davvero alla query dell'utente
function validatePubChemResult(query, pubchemName) {
  if (!pubchemName) return false;
  const q = query.toLowerCase().replace(/[\s\-_]/g, '');
  const p = pubchemName.toLowerCase().replace(/[\s\-_]/g, '');
  // Match esatto o contenuto
  if (p.includes(q) || q.includes(p)) return true;
  // Almeno 60% delle lettere in comune
  const qChars = new Set(q.split(''));
  const pChars = new Set(p.split(''));
  let common = 0;
  for (const c of qChars) if (pChars.has(c)) common++;
  return common / Math.max(qChars.size, 1) > 0.6;
}

async function deepProductSearch(description) {
  const startTime = Date.now();

  // STEP 0: Classifica l'input dell'utente DIRETTAMENTE con le regole
  // Questo cattura nomi come "Deoxyribonuclease" → enzima, SENZA bisogno di PubChem
  const directClassification = classifyFromText(description);

  // STEP 1: Keyword matching rapido
  const keywordResults = smartCategoryMatch(description);
  const bestKeywordScore = keywordResults.length > 0 ? keywordResults[0].confidenza : 0;

  // Se classificazione diretta è forte, restituisci subito
  if (directClassification.length > 0 && directClassification[0].confidenza >= 9) {
    const best = directClassification[0];
    return {
      suggerimenti: [{
        famiglia: best.famiglia,
        sottofamiglia: best.sottofamiglia,
        confidenza: best.confidenza,
        spiegazione: `Classificazione diretta: ${best.label} (dal nome del prodotto "${description}")`
      }],
      fonti: ['Classificazione diretta dal nome prodotto'],
      tempo: Date.now() - startTime
    };
  }

  if (bestKeywordScore >= 8) {
    return {
      suggerimenti: keywordResults,
      fonti: ['Database interno (match diretto)'],
      tempo: Date.now() - startTime
    };
  }

  // STEP 2: Ricerca parallela nei database scientifici
  const [pubchem, uniprot, europmc] = await Promise.all([
    searchPubChem(description),
    searchUniProt(description),
    searchEuropePMC(description)
  ]);

  const fonti = [];
  let primaryText = description + ' ';
  let productInfo = null;

  // Valida PubChem — il nome restituito deve corrispondere alla query
  if (pubchem.found && validatePubChemResult(description, pubchem.name)) {
    fonti.push(`PubChem: ${pubchem.name}`);
    primaryText += (pubchem.descriptions || []).join(' ') + ' ' + (pubchem.synonyms || []).join(' ') + ' ';
    productInfo = { name: pubchem.name, source: 'PubChem', descriptions: pubchem.descriptions || [], synonyms: pubchem.synonyms || [] };
  } else if (pubchem.found) {
    // PubChem ha trovato qualcosa ma non corrisponde — segnala ma non usare per classificazione
    fonti.push(`PubChem: trovato "${pubchem.name}" (non corrisponde esattamente)`);
  }

  if (uniprot.found) {
    fonti.push(`UniProt: ${uniprot.results[0]?.name}`);
    primaryText += uniprot.fullText + ' ';
    if (!productInfo) {
      productInfo = { name: uniprot.results[0]?.name, source: 'UniProt', descriptions: [uniprot.results[0]?.function], synonyms: uniprot.results[0]?.genes || [] };
    }
  }

  if (europmc.found) {
    fonti.push(`Europe PMC: ${europmc.articles.length} pubblicazioni`);
  }

  // STEP 3: Classifica dal testo primario (input utente + PubChem validato + UniProt)
  const primaryClassification = classifyFromText(primaryText);

  // STEP 4: Usa classificazione diretta se PubChem non ha aggiunto nulla di meglio
  let bestClassification = primaryClassification;
  if (directClassification.length > 0 && (primaryClassification.length === 0 || directClassification[0].confidenza >= primaryClassification[0].confidenza)) {
    bestClassification = directClassification;
  }

  // STEP 5: Costruisci suggerimenti
  let suggerimenti = [];

  if (bestClassification.length > 0) {
    const best = bestClassification[0];
    suggerimenti.push({
      famiglia: best.famiglia,
      sottofamiglia: best.sottofamiglia,
      confidenza: best.confidenza,
      spiegazione: productInfo
        ? `Prodotto identificato: ${productInfo.name} (${productInfo.source}). Tipo: ${best.label}. ${productInfo.descriptions?.[0]?.substring(0, 200) || ''}`
        : `Classificazione: ${best.label} (dal nome del prodotto)`
    });

    for (let i = 1; i < bestClassification.length && suggerimenti.length < 3; i++) {
      const sec = bestClassification[i];
      if (sec.sottofamiglia !== best.sottofamiglia) {
        suggerimenti.push({
          famiglia: sec.famiglia,
          sottofamiglia: sec.sottofamiglia,
          confidenza: Math.max(5, sec.confidenza - 2),
          spiegazione: `Classificazione alternativa: ${sec.label}`
        });
      }
    }
  }

  if (suggerimenti.length === 0 && pubchem.found) {
    suggerimenti.push({
      famiglia: 'Lab Reagents',
      sottofamiglia: 'CHEMICALS - POLVERI',
      confidenza: 7,
      spiegazione: `Composto chimico trovato su PubChem: ${pubchem.name}. ${pubchem.descriptions?.[0]?.substring(0, 200) || ''}`
    });
  }

  if (suggerimenti.length === 0 && uniprot.found) {
    suggerimenti.push({
      famiglia: 'Lab Reagents',
      sottofamiglia: 'ANTICORPI - WB (Western Blot)',
      confidenza: 6,
      spiegazione: `Proteina identificata su UniProt: ${uniprot.results[0]?.name}. Potrebbe essere un target per anticorpi.`
    });
  }

  if (keywordResults.length > 0 && suggerimenti.length < 3) {
    for (const kr of keywordResults) {
      if (!suggerimenti.find(s => s.sottofamiglia === kr.sottofamiglia)) {
        suggerimenti.push(kr);
      }
    }
  }

  return {
    suggerimenti: suggerimenti.slice(0, 3),
    fonti: fonti.length ? fonti : ['Nessun risultato trovato nei database scientifici'],
    productInfo,
    tempo: Date.now() - startTime
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATI — Categorie merceologiche Alyante
// ═══════════════════════════════════════════════════════════════════════════════

const categories = [
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Puntali con filtro' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Puntali senza filtro' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Tubi and Plates' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Stripette' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Petri dish' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Multiwell' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Fiasche tappo ventilato' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Fiasche tappo non ventilato' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Cell Scrapers' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Cell strainers' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Cell Stack' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Filtri a bicchiere (Stericup)' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Cryovials' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Counting Slides' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Vials' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Multipette' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Cuvette' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Slides' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Strips' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Pipette monocanale' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Pipette multicanale' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Liquid handling consumables' },
  { numero: 1, famiglia: 'Plasticware', sottofamiglia: 'Altro' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Bottle' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Beute Erlenmeyer' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Microtube' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Glass slides (vetrini) - portaoggetto, coprioggetto' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'PROTEZIONE: camici, calzari, sopracalzari, guanti nitrile, guanti lattice' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'BUSTE BIOHAZARD RIFIUTI SPECIALI' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'CONSERVAZIONE CAMPIONI: contenitori PCR, cryoboxes, Parafilm, box' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'Disposable generale: nastro autoclave, carta da banco, cartine pH, spruzzette, pinze, aghi, lame, siringhe, anse, detergenti, alcool' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'Rotoli carta' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'Sicurezza' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Cancelleria' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Materiale generico vario' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Riviste' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Pubblicazioni' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Apparecchiatura Elettronica: microscopi, fotodocumentazione (Gel Doc, Chemidoc), pHmetri, spettrofotometri, power supply, bilance, cell counter, FACS, luminometro/fluorimetro' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Apparecchiatura Meccanica: centrifughe, ultracentrifughe, vortex, robot liquid handling' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Apparecchiatura Termoregolatore: freezer, frigoriferi, thermomixer, contenitore criogenico (azoto liquido), bagnetti termostatati, stufe, PCR, real time, incubatori, produttori ghiaccio, autoclavi, stirrer' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Arredi Ufficio' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Arredi Laboratorio' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Taratura, PQ, IQ, OQ - Maintenance' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'PC' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Software' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Manutenzione software' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Materiale informatico: laptop, desktop, mouse, stampanti, toner' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Manutenzione hardware' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'KIT: estrazione, purificazione, luciferase assay, kit vitalita, ELISA, enrichment, depletion' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'PCR: taq, dye, agarosio, DNA/RNA marker' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'REAL TIME PCR: sybr green, mastermix, taqman, probes' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'NGS: preparazione librerie, purificazione, frammentazione' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'CLONING: cellule competenti, kit clonaggio' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ENZIMI: restrizione, modifica (Molecular Biology)' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'OLIGO' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'SIERI: FBS, FCS, dializzati, horse' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'TERRENI: DMEM, RPMI, Alpha MEM, MEM, Iscove\'s' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ADDITIVI: B27 supplement, glutamine, Pen/Strep, penicillina, streptomicina' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'CITOCHINE' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'TRASFEZIONE' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ANTICORPI - WB (Western Blot)' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ANTICORPI - IHC (Immunoistochimica)' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ANTICORPI - IP (Immunoprecipitazione)' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ANTICORPI - IF (Immunofluorescenza)' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'CHEMICALS - POLVERI' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'CHEMICALS - SOLVENTI' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'Sequenziamento' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'Sintesi: geni, peptidi, plasmidi' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'GAS' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'Reagenti grado GMP per produzioni farmaceutiche' },
  { numero: 7, famiglia: 'Animal Housing', sottofamiglia: 'Acquisto animali' },
  { numero: 7, famiglia: 'Animal Housing', sottofamiglia: 'Materiali di consumo' },
  { numero: 7, famiglia: 'Animal Housing', sottofamiglia: 'Stabulazione' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Logistica' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Consulenze Ricerca' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Consulenze generiche' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Pharma' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Traduzioni' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'GMP' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Supply Chain' },
  { numero: 8, famiglia: 'Servizi', sottofamiglia: 'Viaggi' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DIZIONARIO SINONIMI per matching intelligente categorie
// ═══════════════════════════════════════════════════════════════════════════════

const categoryKeywords = {
  'Plasticware|Puntali con filtro': ['puntali filtro', 'filter tip', 'filtered tip', 'tip filter', 'puntale filtro', 'tips with filter', 'art tips'],
  'Plasticware|Puntali senza filtro': ['puntali', 'tips', 'puntale', 'tip rack', 'puntali universali'],
  'Plasticware|Tubi and Plates': ['tubi', 'tubes', 'plate', 'piastra', 'eppendorf', 'falcon', 'provetta', 'provette', 'microtube', '15ml', '50ml', '1.5ml', '0.5ml', 'pcr plate', 'deep well'],
  'Plasticware|Stripette': ['stripette', 'pipetta sierologica', 'serological pipette'],
  'Plasticware|Petri dish': ['petri', 'piastra petri', 'petri dish', 'capsule petri'],
  'Plasticware|Multiwell': ['multiwell', 'multi-well', '96 well', '24 well', '12 well', '6 well', '48 well', '384 well', 'well plate'],
  'Plasticware|Fiasche tappo ventilato': ['fiasca', 'flask', 'fiasche', 'ventilato', 'vented', 'cell culture flask', 't25', 't75', 't175', 't225'],
  'Plasticware|Cell Scrapers': ['scraper', 'cell scraper', 'raschietto'],
  'Plasticware|Cell strainers': ['strainer', 'cell strainer', 'filtro cellule'],
  'Plasticware|Filtri a bicchiere (Stericup)': ['stericup', 'filtro bicchiere', 'vacuum filter', 'steritop', 'bottle top filter'],
  'Plasticware|Cryovials': ['cryovial', 'criotubo', 'criovial', 'cryogenic vial'],
  'Plasticware|Cuvette': ['cuvetta', 'cuvette', 'cuvetta spettro'],
  'Plasticware|Pipette monocanale': ['pipetta', 'pipette', 'monocanale', 'single channel', 'micropipetta'],
  'Plasticware|Pipette multicanale': ['multicanale', 'multichannel', '8 canali', '12 canali'],
  'Glassware|Bottle': ['bottiglia vetro', 'glass bottle', 'bottle', 'duran', 'schott'],
  'Glassware|Beute Erlenmeyer': ['beuta', 'erlenmeyer', 'beute'],
  'Glassware|Glass slides (vetrini) - portaoggetto, coprioggetto': ['vetrino', 'vetrini', 'glass slide', 'coprioggetto', 'portaoggetto', 'coverslip', 'microscope slide'],
  'Disposable|PROTEZIONE: camici, calzari, sopracalzari, guanti nitrile, guanti lattice': ['guanti', 'gloves', 'nitrile', 'lattice', 'camice', 'camici', 'calzari', 'sopracalzari', 'dpi'],
  'Disposable|BUSTE BIOHAZARD RIFIUTI SPECIALI': ['biohazard', 'rifiuti', 'buste', 'sacchetti rifiuti', 'waste bag'],
  'Disposable|CONSERVAZIONE CAMPIONI: contenitori PCR, cryoboxes, Parafilm, box': ['cryobox', 'parafilm', 'contenitore pcr', 'box campioni', 'rack', 'scatola congelamento'],
  'Disposable|Disposable generale: nastro autoclave, carta da banco, cartine pH, spruzzette, pinze, aghi, lame, siringhe, anse, detergenti, alcool': ['nastro', 'autoclave tape', 'carta banco', 'pH', 'spruzzetta', 'siringa', 'syringe', 'ago', 'needle', 'lama', 'blade', 'ansa', 'loop', 'detergente', 'alcool', 'ethanol', 'isopropanol'],
  'Cancelleria & Stampati|Cancelleria': ['penna', 'carta', 'busta', 'toner', 'cancelleria', 'post-it', 'block notes'],
  'Equipments e Arredi|Apparecchiatura Elettronica: microscopi, fotodocumentazione (Gel Doc, Chemidoc), pHmetri, spettrofotometri, power supply, bilance, cell counter, FACS, luminometro/fluorimetro': ['microscopio', 'microscope', 'gel doc', 'chemidoc', 'phmetro', 'spettrofotometro', 'spectrophotometer', 'nanodrop', 'power supply', 'bilancia', 'cell counter', 'facs', 'citofluorimetro', 'flow cytometer', 'luminometro', 'fluorimetro', 'plate reader'],
  'Equipments e Arredi|Apparecchiatura Meccanica: centrifughe, ultracentrifughe, vortex, robot liquid handling': ['centrifuga', 'centrifuge', 'ultracentrifuga', 'vortex', 'robot', 'liquid handler', 'hamilton', 'biomek'],
  'Equipments e Arredi|Apparecchiatura Termoregolatore: freezer, frigoriferi, thermomixer, contenitore criogenico (azoto liquido), bagnetti termostatati, stufe, PCR, real time, incubatori, produttori ghiaccio, autoclavi, stirrer': ['freezer', 'frigorifero', 'thermomixer', 'azoto liquido', 'bagnetto', 'water bath', 'stufa', 'oven', 'termociclatore', 'thermal cycler', 'pcr machine', 'real time', 'incubatore', 'incubator', 'autoclave', 'stirrer', 'ghiaccio', 'ice machine'],
  'IT|Materiale informatico: laptop, desktop, mouse, stampanti, toner': ['laptop', 'computer', 'desktop', 'mouse', 'stampante', 'printer', 'monitor', 'tastiera', 'keyboard'],
  'IT|Software': ['software', 'licenza', 'license', 'abbonamento software'],
  'Lab Reagents|KIT: estrazione, purificazione, luciferase assay, kit vitalita, ELISA, enrichment, depletion': ['kit', 'estrazione', 'extraction', 'purificazione', 'purification', 'luciferase', 'elisa', 'miniprep', 'maxiprep', 'midiprep', 'rneasy', 'dneasy', 'blood kit', 'tissue kit'],
  'Lab Reagents|PCR: taq, dye, agarosio, DNA/RNA marker': ['taq', 'polymerase', 'agarosio', 'agarose', 'dna marker', 'rna marker', 'ladder', 'loading dye', 'pcr master', 'dreamtaq', 'phusion', 'q5'],
  'Lab Reagents|REAL TIME PCR: sybr green, mastermix, taqman, probes': ['sybr', 'taqman', 'probe', 'real time', 'qpcr', 'rt-pcr', 'mastermix', 'power sybr'],
  'Lab Reagents|NGS: preparazione librerie, purificazione, frammentazione': ['ngs', 'next gen', 'libreria', 'library prep', 'frammentazione', 'nextera', 'truseq', 'illumina kit', 'sequencing kit'],
  'Lab Reagents|CLONING: cellule competenti, kit clonaggio': ['competenti', 'competent cell', 'clonaggio', 'cloning', 'gateway', 'topo', 'gibson', 'ligation', 'ligasi'],
  'Lab Reagents|ENZIMI: restrizione, modifica (Molecular Biology)': ['enzima restrizione', 'restriction enzyme', 'ecori', 'bamhi', 'hindiii', 'xhoi', 'noti', 'ligase', 'fosfatasi', 'chinasi', 'phosphatase', 'kinase', 'nuclease', 'dnase', 'rnase', 'deoxyribonuclease', 'ribonuclease', 'endonuclease', 'exonuclease', 'topoisomerase', 'caspase', 'collagenase', 'trypsin', 'dispase', 'proteinase', 'reverse transcriptase', 'luciferase', 'benzonase', 'turbo dnase', 'proteinase k'],
  'Lab Reagents|OLIGO': ['oligo', 'oligonucleotide', 'primer', 'primers', 'probe', 'custom oligo', 'idt'],
  'Lab Reagents|SIERI: FBS, FCS, dializzati, horse': ['fbs', 'fcs', 'siero', 'serum', 'fetal bovine', 'horse serum', 'siero fetale'],
  'Lab Reagents|TERRENI: DMEM, RPMI, Alpha MEM, MEM, Iscove\'s': ['dmem', 'rpmi', 'mem', 'terreno', 'medium', 'media', 'iscove', 'f12', 'ham'],
  'Lab Reagents|ADDITIVI: B27 supplement, glutamine, Pen/Strep, penicillina, streptomicina': ['glutamine', 'glutamax', 'pen/strep', 'penicillina', 'streptomicina', 'b27', 'supplement', 'additivo', 'neaa', 'amino acid'],
  'Lab Reagents|CITOCHINE': ['citochina', 'cytokine', 'growth factor', 'fattore crescita', 'il-2', 'il-6', 'tnf', 'ifn', 'vegf', 'egf', 'fgf', 'bmp', 'wnt', 'scf'],
  'Lab Reagents|TRASFEZIONE': ['trasfezione', 'transfection', 'lipofectamine', 'lipofection', 'electroporation', 'nucleofection', 'fugene'],
  'Lab Reagents|ANTICORPI - WB (Western Blot)': ['anticorpo', 'antibody', 'western blot', 'wb', 'primary antibody', 'secondary antibody', 'hrp', 'anti-'],
  'Lab Reagents|ANTICORPI - IHC (Immunoistochimica)': ['ihc', 'immunoistochimica', 'immunohistochemistry', 'paraffin'],
  'Lab Reagents|ANTICORPI - IP (Immunoprecipitazione)': ['immunoprecipitazione', 'ip', 'co-ip', 'chip', 'pulldown', 'pull-down'],
  'Lab Reagents|ANTICORPI - IF (Immunofluorescenza)': ['immunofluorescenza', 'immunofluorescence', 'fluorescent antibody', 'alexa fluor', 'fitc', 'pe ', 'apc'],
  'Lab Reagents|CHEMICALS - POLVERI': ['polvere', 'powder', 'chemical', 'reagente', 'reagent', 'tris', 'nacl', 'edta', 'sds', 'dtt', 'bsa', 'agar'],
  'Lab Reagents|CHEMICALS - SOLVENTI': ['solvente', 'solvent', 'metanolo', 'methanol', 'acetone', 'cloroformio', 'dmso', 'dmf', 'etanolo', 'xilene'],
  'Lab Reagents|Sequenziamento': ['sequenziamento', 'sequencing', 'sanger', 'genewiz', 'eurofins sequencing'],
  'Lab Reagents|Sintesi: geni, peptidi, plasmidi': ['sintesi gene', 'gene synthesis', 'peptide synthesis', 'plasmide', 'plasmid', 'gblock', 'custom gene'],
  'Lab Reagents|GAS': ['gas', 'co2', 'azoto', 'nitrogen', 'ossigeno', 'oxygen', 'bombola'],
  'Animal Housing|Acquisto animali': ['topi', 'mice', 'mouse', 'ratto', 'rat', 'animale', 'animal', 'jackson lab', 'charles river animal'],
  'Animal Housing|Materiali di consumo': ['gabbia', 'cage', 'bedding', 'lettiera', 'mangime', 'food pellet'],
  'Servizi|Logistica': ['logistica', 'trasporto', 'spedizione', 'corriere', 'shipping'],
  'Servizi|Consulenze Ricerca': ['consulenza ricerca', 'research consulting', 'cro', 'contract research'],
};

// Dizionario alias brand (nome comune -> nome nel database)
const brandAliases = {
  'proteintech': ['PTGLAB', 'PTGLAB'],
  'protein tech': ['PTGLAB'],
  'sigma': ['Merck/SigmaAldrich/Millipore', 'MERCK'],
  'sigma aldrich': ['Merck/SigmaAldrich/Millipore'],
  'sigma-aldrich': ['Merck/SigmaAldrich/Millipore'],
  'millipore': ['Merck/SigmaAldrich/Millipore'],
  'invitrogen': ['Life Technologies', 'Thermo Fisher Scientific'],
  'gibco': ['GIBCO'],
  'thermo': ['Thermo Fisher Scientific', 'Life Technologies', 'Thermo Fisher (ACROS, ALFA AESAR)'],
  'thermofisher': ['Thermo Fisher Scientific', 'Life Technologies'],
  'thermo fisher': ['Thermo Fisher Scientific', 'Life Technologies'],
  'applied biosystems': ['APPLIED BIOSYSTEM'],
  'neb': ['NEW ENGLAND BIOLABS'],
  'new england biolabs': ['NEW ENGLAND BIOLABS'],
  'cst': ['Cell Signaling Technology', 'Cell Signaling'],
  'cell signaling': ['Cell Signaling Technology', 'Cell Signaling'],
  'bd biosciences': ['BD'],
  'bd': ['BD'],
  'becton dickinson': ['BD'],
  'zymo': ['Zymo'],
  'zymo research': ['Zymo'],
  'takara': ['Takara Bio Inc.'],
  'clontech': ['Takara Bio Inc.'],
  'lonza': ['LONZA'],
  'corning': ['Corning - Falcon', 'Corning/Falcon/Axygen', 'CORNING', 'Corning'],
  'falcon': ['Corning - Falcon', 'Corning/Falcon/Axygen'],
  'axygen': ['Corning/Falcon/Axygen'],
  'whatman': ['Cytiva/Whatman'],
  'cytiva': ['Cytiva - GEA', 'Cytiva/Whatman'],
  'ge healthcare': ['Cytiva - GEA'],
  'greiner': ['Greiner BioOne', 'Greiner'],
  'sartorius': ['SARTORIUS'],
  'eppendorf': ['EPPENDORF', 'Eppendorf'],
  'biolegend': ['BioLegend', 'Biolegend'],
  'peprotech': ['PEPROTECH', 'Peprotech'],
  'stemcell': ['StemCell Technologies'],
  'stem cell': ['StemCell Technologies'],
  'stemcell technologies': ['StemCell Technologies'],
  'jackson': ['Jackson ImmunoResearch'],
  'jackson immunoresearch': ['Jackson ImmunoResearch'],
  'selleckchem': ['Selleck'],
  'selleck': ['Selleck'],
  'roche': ['Roche', 'Roche/KAPA'],
  'kapa': ['Roche/KAPA'],
  'macherey': ['MACHEREY NAGEL'],
  'macherey-nagel': ['MACHEREY NAGEL'],
  'mn': ['MACHEREY NAGEL'],
  'dharmacon': ['HORIZON / DHARMACON'],
  'horizon': ['HORIZON / DHARMACON'],
  'abcam': ['Abcam'],
  'origene': ['ORIGENE', 'Origene'],
  'idt': ['IDT'],
  'integrated dna': ['IDT'],
  'twist': ['Twist Bioscience'],
  'twist bioscience': ['Twist Bioscience'],
  'illumina': ['ILLUMINA'],
  'qiagen': ['QIAGEN'],
  'promega': ['Promega'],
  'bio-rad': ['Bio-Rad', 'BIO-RAD'],
  'biorad': ['Bio-Rad', 'BIO-RAD'],
  'agilent': ['Agilent'],
  'gilson': ['GILSON'],
  'sarstedt': ['Sarstedt'],
  'miltenyi': ['Miltenyi'],
  'atcc': ['ATCC'],
  'starlab': ['Starlab'],
  'oxford nanopore': ['Oxford Nanopore'],
  'nanopore': ['Oxford Nanopore'],
  'vwr': ['VWR Collection', 'Avantor'],
  'avantor': ['Avantor'],
  'eurofins': ['EUROFINS GENOMICS'],
  'sino biological': ['Sino Biological'],
  'genetex': ['Genetex'],
  'diagenode': ['Diagenode'],
  'invivogen': ['InvivoGen'],
  'trilink': ['Trilink Biotechnologies'],
  'genscript': ['Genscript'],
  'targetmol': ['TargetMol'],
  'santa cruz': ['Santa Cruz'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATI — Distributori e condizioni
// ═══════════════════════════════════════════════════════════════════════════════


const distributors = [
  { nome: '2Biological Instruments', min_ordine: '150 €', spese_spedizione: '€25 per ordini < €500', spese_ghiaccio_secco: '/' },
  { nome: 'AGILENT TECHNOLOGIES ITALIA SPA', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Aurogene srl', min_ordine: '500 €', spese_spedizione: '€25 (+IVA) per ordini < €500', spese_ghiaccio_secco: '/' },
  { nome: 'BECTON DICKINSON ITALIA S.p.A.', min_ordine: '/', spese_spedizione: '€50+IVA std; €75+IVA espresso; €35 ordini <€1000', spese_ghiaccio_secco: '/' },
  { nome: 'Beckman Coulter Srl', min_ordine: '/', spese_spedizione: '50 €', spese_ghiaccio_secco: '/' },
  { nome: 'Bio-Rad', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Bio-Techne s.r.l.', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '50 €' },
  { nome: 'Campoverde srl', min_ordine: '/', spese_spedizione: '€42 (nulle su Milano)', spese_ghiaccio_secco: '15 €' },
  { nome: 'Carlo Erba Reagents Srl', min_ordine: '50 €', spese_spedizione: '50-200€=€65+IVA; 200-500€=€48+IVA; Web 50-200€=€35; Web 200-300€=€20', spese_ghiaccio_secco: 'Ghiaccio secco €30+IVA; CPA €70+IVA' },
  { nome: 'D.B.A. Italia srl', min_ordine: '/', spese_spedizione: '€20 (+IVA) per ordini < €500', spese_ghiaccio_secco: '30 €' },
  { nome: 'D.I.D. Diagnostic International Distribution Spa', min_ordine: '/', spese_spedizione: '€40 per ordini < €350', spese_ghiaccio_secco: '25 €' },
  { nome: 'Diatech Lab Line srl', min_ordine: '150 €', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Eppendorf srl', min_ordine: '/', spese_spedizione: '€35 (+IVA) per ordini < €500', spese_ghiaccio_secco: '/' },
  { nome: 'Eurofins Genomics Italy S.r.l.', min_ordine: '/', spese_spedizione: 'gratuite', spese_ghiaccio_secco: '/' },
  { nome: 'Euroclone S.p.A.', min_ordine: '150 €', spese_spedizione: 'Nessuna', spese_ghiaccio_secco: 'Nessuna (eccetto azoto liquido dewar: €450)' },
  { nome: 'Gilson Italia srl', min_ordine: '300 €', spese_spedizione: '€50 per ordini < €500', spese_ghiaccio_secco: '/' },
  { nome: 'Illumina Italy srl', min_ordine: '/', spese_spedizione: '150 €', spese_ghiaccio_secco: '/' },
  { nome: 'LGC Standards', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Life Technologies (ThermoFisher)', min_ordine: '/', spese_spedizione: '<€2000: €48+IVA; Hazard: €48; Oligo tubi: €12; Oligo piastre: €70', spese_ghiaccio_secco: '€48+IVA' },
  { nome: 'MedChemTronica', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Merck Life Science S.R.L.', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '55 €' },
  { nome: 'Miltenyi Biotec srl', min_ordine: '/', spese_spedizione: '€35 (+IVA) per ordini < €500', spese_ghiaccio_secco: '/' },
  { nome: 'PRODOTTI GIANNI srl', min_ordine: '/', spese_spedizione: '€29 gestione; gratis >600€', spese_ghiaccio_secco: 'Dry ice: 20€; DataLogger: 60€; HAZARD: 40€' },
  { nome: 'Promega Italia srl', min_ordine: '/', spese_spedizione: '€50 per ordini < €400', spese_ghiaccio_secco: '€30 per ordini < €400' },
  { nome: 'Qiagen srl', min_ordine: '/', spese_spedizione: '€40 (+IVA) per ordini < €1000; €38 per ordini < €400', spese_ghiaccio_secco: '24 €' },
  { nome: 'REVVITY ITALIA SPA', min_ordine: '/', spese_spedizione: 'variabile', spese_ghiaccio_secco: 'variabile' },
  { nome: 'Roche Diagnostics', min_ordine: '/', spese_spedizione: '€30 per ordini < €300', spese_ghiaccio_secco: '/' },
  { nome: 'S.I.A.L. S.r.l.', min_ordine: '200 €', spese_spedizione: '€20 per ordini < €200', spese_ghiaccio_secco: '€20 per ordini < €200' },
  { nome: 'SARTORIUS ITALY SRL', min_ordine: '/', spese_spedizione: '€28 per ordini < €500', spese_ghiaccio_secco: '/' },
  { nome: 'Sarstedt srl', min_ordine: '200 € (+IVA)', spese_spedizione: '€25 (+IVA) per ordini < €300', spese_ghiaccio_secco: '/' },
  { nome: 'Starlab srl', min_ordine: '100 €', spese_spedizione: '€40 per ordini < €400', spese_ghiaccio_secco: '/' },
  { nome: 'TebuBio srl', min_ordine: '/', spese_spedizione: '€30 (+IVA) per ordini < €100', spese_ghiaccio_secco: '€52 ghiaccio; €255 azoto liquido' },
  { nome: 'Tema Ricerca srl', min_ordine: '/', spese_spedizione: '€20 (+IVA) per ordini < €400', spese_ghiaccio_secco: '30 €' },
  { nome: 'Twin Helix srl', min_ordine: '100 €', spese_spedizione: '€25 per ordini < €250', spese_ghiaccio_secco: '30 €' },
  { nome: 'VWR International S.r.l.', min_ordine: '400 € (altrimenti €30 gestione)', spese_spedizione: '<€400: €30; >€400: gratuito', spese_ghiaccio_secco: 'vedi condizioni' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DATI — Brand distribuiti
// ═══════════════════════════════════════════════════════════════════════════════

const distributorBrands = [
  // === 2Biological Instruments ===
  { distributore: '2Biological', brand: 'FINE SCIENCE TOOLS', esclusiva: true },
  // === AGILENT ===
  { distributore: 'Agilent', brand: 'Agilent', esclusiva: true },
  // === Aurogene ===
  { distributore: 'Aurogene', brand: 'Abclonal', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Advasta', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Akadeum', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Atlas Antibodies', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Axion Biosystems', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Axol Bioscience', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Azure', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Bethyl', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Bioline', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Biolegend', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Bioss', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Biotium', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Biowest', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Cell Signaling', esclusiva: false },
  { distributore: 'Aurogene', brand: 'CellGS', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Cytek', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Diagenode', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Immunostep', esclusiva: true },
  { distributore: 'Aurogene', brand: 'InvivoGen', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Mabtech', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Meridian Bioscience', esclusiva: false },
  { distributore: 'Aurogene', brand: 'OZBioscience', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Quantum-Si', esclusiva: false },
  { distributore: 'Aurogene', brand: 'SERVA', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Santa Cruz', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Selleck', esclusiva: true },
  { distributore: 'Aurogene', brand: 'SouthernBiotech', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Zymo', esclusiva: true },
  // === BECTON DICKINSON ===
  { distributore: 'BECTON DICKINSON', brand: 'BD', esclusiva: true },
  // === Beckman Coulter ===
  { distributore: 'Beckman Coulter', brand: 'Beckman Coulter', esclusiva: true },
  // === Bio-Rad ===
  { distributore: 'Bio-Rad', brand: 'Bio-Rad', esclusiva: true },
  // === Bio-Techne ===
  { distributore: 'Bio-Techne', brand: 'ACD', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'ELLA', esclusiva: false },
  { distributore: 'Bio-Techne', brand: 'Lunaphore', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'Namocell', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'Novus Biologicals', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'ProteinSimple', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'R&D Systems', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'Tocris Bioscience', esclusiva: true },
  // === Campoverde ===
  { distributore: 'Campoverde', brand: 'Arrow Biotech', esclusiva: false },
  { distributore: 'Campoverde', brand: 'BioLegend', esclusiva: false },
  // === Carlo Erba Reagents ===
  { distributore: 'Carlo Erba Reagents', brand: 'AZENTA (4tiTUDE)', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'BRAND GMBH', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'CPAchem', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Carlo Erba Reagents', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'EVERMED', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'FASTER', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'GS BIOTECH', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'Glentham Life Science', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'HORIZON / DHARMACON', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'JET BIOFIL', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'LABOR SECURITY SYSTEM', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'LLG', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'LNI', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'LevitasBio', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'MACHEREY NAGEL', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'METABION', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'MICROSYNTH', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'PROMOCELL', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'SCALE Biosciences', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'SOLIS BIODYNE', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Stilla Technologies', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Thermo Fisher (ACROS, ALFA AESAR)', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Thermo Fisher Scientific (Fermentas)', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Thermo Fisher Scientific (Nunc, MBP)', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'VIZGEN', esclusiva: true },
  // === D.B.A. Italia ===
  { distributore: 'D.B.A.', brand: 'AAT Bioquest', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'ACRO Biosystems', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'AMSBIO', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'ASSAYGENIE', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'AnaSpec', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Abnova', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Applichem', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'BIORBYT', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'BPS Bioscience', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Bachem', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Bio X Cell', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'CLOUD CLONE', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'CUSABIO', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Cell Biolabs', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'ChromoTek', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Cosmo Bio', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Creative Biolabs', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'EXBIO', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'FUJIFILM Wako', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Focus Biomolecules', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'GenScript', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Kerafast', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'LSBio', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'MEDCHEM', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'MyBioSource', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'OriGene', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PAN-Biotech', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PEPROTECH', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PTGLAB', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Progen', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Proteintech', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'SYNAPTIC SYSTEMS (SYSY)', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Santa Cruz Biotechnology', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Sino Biological', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'StressMarq Biosciences', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'VectorBuilder', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'VectorLabs', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Worthington', esclusiva: false },
  // === D.I.D. ===
  { distributore: 'D.I.D.', brand: 'Biolamina', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Bionano', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'Biotechrabbit', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'Biowest', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'CGT Global', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'Canvax', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'CelanNA', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'DNA Genotek', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'Evercyte', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'MBL', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Minerva Biolabs', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'PSS', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'Provitro', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'StemCell Technologies', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Thistle', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'Youseq', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'ZenCell OWL', esclusiva: false },
  // === Diatech Lab Line ===
  { distributore: 'Diatech Lab Line', brand: 'Biosan', esclusiva: false },
  { distributore: 'Diatech Lab Line', brand: 'Bruker Spatial Biology', esclusiva: true },
  { distributore: 'Diatech Lab Line', brand: 'DeNovix', esclusiva: true },
  { distributore: 'Diatech Lab Line', brand: 'Grant Instruments', esclusiva: false },
  { distributore: 'Diatech Lab Line', brand: 'Labnet International', esclusiva: false },
  { distributore: 'Diatech Lab Line', brand: 'Mission Bio', esclusiva: true },
  { distributore: 'Diatech Lab Line', brand: 'NanoString Technologies', esclusiva: false },
  { distributore: 'Diatech Lab Line', brand: 'Singleron Biotechnologies', esclusiva: true },
  { distributore: 'Diatech Lab Line', brand: 'Takara Bio Inc.', esclusiva: true },
  { distributore: 'Diatech Lab Line', brand: 'Twist Bioscience', esclusiva: true },
  { distributore: 'Diatech Lab Line', brand: 'Watchmaker Genomics', esclusiva: true },
  // === Eppendorf ===
  { distributore: 'EPPENDORF', brand: 'EPPENDORF', esclusiva: true },
  // === Eurofins Genomics ===
  { distributore: 'EUROFINS GENOMICS', brand: 'EUROFINS GENOMICS', esclusiva: true },
  // === Euroclone ===
  { distributore: 'Euroclone', brand: '10X Genomics', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Applied Cells', esclusiva: false },
  { distributore: 'Euroclone', brand: 'BMG Labtech', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Bio X Cell', esclusiva: false },
  { distributore: 'Euroclone', brand: 'BiOptic', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Bioreba', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Capp-AHN', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Cedarlane Labs', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Celemics', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Cell Signaling Technology', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Corning - Falcon', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Covaris', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Cytiva - GEA', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Enzo Life Sciences', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Euroclone Brand', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Greiner BioOne', esclusiva: false },
  { distributore: 'Euroclone', brand: 'ITW reagents (Applichem - Panreac)', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Implen', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Jackson ImmunoResearch', esclusiva: false },
  { distributore: 'Euroclone', brand: 'LI-COR Biosciences', esclusiva: false },
  { distributore: 'Euroclone', brand: 'LONZA', esclusiva: true },
  { distributore: 'Euroclone', brand: 'MGI', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Magtivio', esclusiva: false },
  { distributore: 'Euroclone', brand: 'NEW ENGLAND BIOLABS', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Navinci', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Nordmark', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Polyplus-Transfection', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Roche', esclusiva: false },
  { distributore: 'Euroclone', brand: 'S2 Genomics', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Sage Science', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Sigma Zentrifugen', esclusiva: false },
  { distributore: 'Euroclone', brand: 'Sophia Genetics', esclusiva: false },
  { distributore: 'Euroclone', brand: 'System Biosciences', esclusiva: true },
  { distributore: 'Euroclone', brand: 'Zymo', esclusiva: false },
  // === Gilson ===
  { distributore: 'GILSON', brand: 'GILSON', esclusiva: true },
  // === Illumina ===
  { distributore: 'ILLUMINA', brand: 'ILLUMINA', esclusiva: true },
  // === LGC Standards ===
  { distributore: 'LGC STANDARDS', brand: 'ATCC', esclusiva: true },
  // === Life Technologies (ThermoFisher) ===
  { distributore: 'Life Technologies', brand: 'APPLIED BIOSYSTEM', esclusiva: true },
  { distributore: 'Life Technologies', brand: 'GIBCO', esclusiva: true },
  { distributore: 'Life Technologies', brand: 'Life Technologies', esclusiva: true },
  { distributore: 'Life Technologies', brand: 'PEPROTECH', esclusiva: true },
  // === MedChemTronica ===
  { distributore: 'MedChem', brand: 'MedChem', esclusiva: true },
  // === Merck Life Science ===
  { distributore: 'Merck Life Science', brand: 'Avanti Polar Lipids', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Brand', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Corning/Falcon/Axygen', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Cytiva/Whatman', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Eppendorf', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Greiner', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Hamilton', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Hettich', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'IKA', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Merck/SigmaAldrich/Millipore', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Nunc', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Roche/KAPA', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Wilmad', esclusiva: false },
  // === Miltenyi ===
  { distributore: 'Miltenyi', brand: 'Miltenyi', esclusiva: true },
  // === PRODOTTI GIANNI ===
  { distributore: 'PRODOTTI GIANNI', brand: 'Abcam', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Arima Genomics', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Capricorn Scientific', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Carl Roth', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Genetex', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'HuaBio', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'IBL International', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Jackson ImmunoResearch', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Lexogen', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'NZYtech', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Nordic Biosite', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Origene', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Raybiotech', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Sino Biological', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'TargetMol', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Universal Sequencing', esclusiva: false },
  // === Promega ===
  { distributore: 'Promega', brand: 'Promega', esclusiva: true },
  // === Qiagen ===
  { distributore: 'QIAGEN', brand: 'QIAGEN', esclusiva: true },
  // === REVVITY ===
  { distributore: 'Revvity', brand: 'Revvity Inc.', esclusiva: true },
  // === Roche ===
  { distributore: 'Roche', brand: 'Roche', esclusiva: true },
  // === S.I.A.L. ===
  { distributore: 'SIAL', brand: 'ABM Good', esclusiva: true },
  { distributore: 'SIAL', brand: 'Agena', esclusiva: true },
  { distributore: 'SIAL', brand: 'AmoyDx', esclusiva: false },
  { distributore: 'SIAL', brand: 'Analytik Jena', esclusiva: true },
  { distributore: 'SIAL', brand: 'Antibodies.com', esclusiva: true },
  { distributore: 'SIAL', brand: 'Antibodysystems', esclusiva: true },
  { distributore: 'SIAL', brand: 'BD', esclusiva: false },
  { distributore: 'SIAL', brand: 'BIO-RAD', esclusiva: false },
  { distributore: 'SIAL', brand: 'BigFish', esclusiva: true },
  { distributore: 'SIAL', brand: 'Biospes', esclusiva: false },
  { distributore: 'SIAL', brand: 'CORNING', esclusiva: false },
  { distributore: 'SIAL', brand: 'Charles River', esclusiva: true },
  { distributore: 'SIAL', brand: 'Coleparmer/Antylia', esclusiva: false },
  { distributore: 'SIAL', brand: 'Cytion', esclusiva: false },
  { distributore: 'SIAL', brand: 'EPPENDORF', esclusiva: false },
  { distributore: 'SIAL', brand: 'Exacta Optech', esclusiva: false },
  { distributore: 'SIAL', brand: 'GILSON', esclusiva: false },
  { distributore: 'SIAL', brand: 'HAIER Biomedical', esclusiva: false },
  { distributore: 'SIAL', brand: 'JPT Peptide Technologies', esclusiva: false },
  { distributore: 'SIAL', brand: 'MERCK', esclusiva: false },
  { distributore: 'SIAL', brand: 'Norgen Biotek', esclusiva: true },
  { distributore: 'SIAL', brand: 'Ohaus', esclusiva: false },
  { distributore: 'SIAL', brand: 'Omega Bio-tek', esclusiva: false },
  { distributore: 'SIAL', brand: 'QuickZyme', esclusiva: false },
  { distributore: 'SIAL', brand: 'Repligen', esclusiva: false },
  { distributore: 'SIAL', brand: 'Signosis Inc', esclusiva: true },
  { distributore: 'SIAL', brand: 'Thermo Fisher Scientific', esclusiva: false },
  { distributore: 'SIAL', brand: 'Twist Bioscience', esclusiva: true },
  { distributore: 'SIAL', brand: 'UVITEC', esclusiva: true },
  { distributore: 'SIAL', brand: 'Varsome', esclusiva: true },
  { distributore: 'SIAL', brand: 'yourSIAL', esclusiva: true },
  // === SARTORIUS ===
  { distributore: 'SARTORIUS', brand: 'SARTORIUS INSTRUMENTS GmbH', esclusiva: true },
  { distributore: 'SARTORIUS', brand: 'SARTORIUS STEDIM BIOTECH GmbH', esclusiva: true },
  // === Sarstedt ===
  { distributore: 'Sarstedt', brand: 'Sarstedt', esclusiva: true },
  // === Starlab ===
  { distributore: 'Starlab', brand: 'Starlab', esclusiva: true },
  // === TebuBio ===
  { distributore: 'TebuBio', brand: 'Abbkine', esclusiva: false },
  { distributore: 'TebuBio', brand: 'AIM Biotech', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Abnova', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Anaspec', esclusiva: false },
  { distributore: 'TebuBio', brand: 'BPS Bioscience', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Bioauxilium Research', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Biocolor ltd', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Biogems', esclusiva: true },
  { distributore: 'TebuBio', brand: 'BioIVT', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Biolife Solutions', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Boster Bio', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Broadpharm', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Cedarlane Laboratoires', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Cell Applications', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Cloud-Clone Corp', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Curi Bio', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Cytion', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Cytoskeleton', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Dojindo Europe', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Echelon Biosciences', esclusiva: true },
  { distributore: 'TebuBio', brand: 'EpiCypher', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Eurogentec', esclusiva: false },
  { distributore: 'TebuBio', brand: 'FUJIFILM Wako', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Full Moon BioSystems', esclusiva: false },
  { distributore: 'TebuBio', brand: 'GenScript', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Genecopoeia', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Innovative Research', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Lifesensors', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Meridian Life Sciences', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Omega Bio-tek', esclusiva: false },
  { distributore: 'TebuBio', brand: 'PBL Assay Science', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Peprotech', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Platypus', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Polysciences Europe', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Prodo Laboratories', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Raybiotech', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Reprocell USA', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Rockland Immunochemicals', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Signagen Laboratories', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Smartox Biotechnology', esclusiva: false },
  { distributore: 'TebuBio', brand: 'Spirochrome AG', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Synbio Technologies', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Trilink Biotechnologies', esclusiva: true },
  { distributore: 'TebuBio', brand: 'Zenbio', esclusiva: false },
  { distributore: 'TebuBio', brand: 'iXcells Biotechnologies', esclusiva: true },
  // === Tema Ricerca ===
  { distributore: 'Tema Ricerca', brand: 'A.El.VIS', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'AFFINITY', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'ARBOR', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'AnyGenes', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'BANGS', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'BETHYL', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'Biosearch Technologies', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'Boster', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'CELLECTA', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'Chi Scientific', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'DBC', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'Diaclone', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'ELABSCIENCE', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'EPIGENTEK', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'GENEALL', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'Genaxxon', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'IDT', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'Kingfisher', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'LUCIGEN', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'MIRUS', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'ORIGENE', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'PacBio', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'Quansys', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'REALSEQ', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'SEEKGENE', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'SEQWEEL', esclusiva: true },
  { distributore: 'Tema Ricerca', brand: 'Surmodics', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'TOYOBO', esclusiva: false },
  { distributore: 'Tema Ricerca', brand: 'UCyTech', esclusiva: false },
  // === Twin Helix ===
  { distributore: 'Twin Helix', brand: 'All Sheng', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Altemis Lab', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'Bio3DPrinting', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Biocomp', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'BiomimX srl', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'Biorep USA', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Brady Corp', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Cell Dynamics', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'CellInk (BICO)', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Dispendix GmbH', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'ELK Biotechnology', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Fluidic Analytics', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Genscript', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'IBA Lifesciences', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Ibidi', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'Idylle', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'IVTech srl', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'LeGene Biosciences', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'Logos Biosystems', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'Microdigital', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'NanoEntek', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'PHC Laboratory Consumables', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'Phase Holographic Imaging', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Protein Fluidics Inc.', esclusiva: true },
  { distributore: 'Twin Helix', brand: 'RWD Life Science', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Repligen', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Reprocell Inc.', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Scienion', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'T-Pro Biotechnology', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'TargetMol', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Thermo Fisher Storage Products', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'Xylyx Bio', esclusiva: false },
  { distributore: 'Twin Helix', brand: 'highQu GmbH', esclusiva: true },
  // === VWR International ===
  { distributore: 'VWR International', brand: 'AAT Bioquest', esclusiva: false },
  { distributore: 'VWR International', brand: 'Abcam', esclusiva: false },
  { distributore: 'VWR International', brand: 'Abnova', esclusiva: false },
  { distributore: 'VWR International', brand: 'Agilent', esclusiva: false },
  { distributore: 'VWR International', brand: 'Apollo Scientific', esclusiva: false },
  { distributore: 'VWR International', brand: 'Applichem', esclusiva: false },
  { distributore: 'VWR International', brand: 'Avantor', esclusiva: true },
  { distributore: 'VWR International', brand: 'Beckman Coulter', esclusiva: false },
  { distributore: 'VWR International', brand: 'Bertin technologies', esclusiva: false },
  { distributore: 'VWR International', brand: 'Biohit', esclusiva: false },
  { distributore: 'VWR International', brand: 'Bioss', esclusiva: false },
  { distributore: 'VWR International', brand: 'Biotium', esclusiva: false },
  { distributore: 'VWR International', brand: 'Biowest', esclusiva: false },
  { distributore: 'VWR International', brand: 'Brand', esclusiva: false },
  { distributore: 'VWR International', brand: 'Corning', esclusiva: false },
  { distributore: 'VWR International', brand: 'Cytiva', esclusiva: false },
  { distributore: 'VWR International', brand: 'Dr. Ehrenstorfer', esclusiva: false },
  { distributore: 'VWR International', brand: 'Duran', esclusiva: false },
  { distributore: 'VWR International', brand: 'ECHO', esclusiva: false },
  { distributore: 'VWR International', brand: 'Eppendorf', esclusiva: false },
  { distributore: 'VWR International', brand: 'GenScript', esclusiva: false },
  { distributore: 'VWR International', brand: 'Gilson', esclusiva: false },
  { distributore: 'VWR International', brand: 'Gosselin', esclusiva: false },
  { distributore: 'VWR International', brand: 'Greiner', esclusiva: false },
  { distributore: 'VWR International', brand: 'Honeywell', esclusiva: false },
  { distributore: 'VWR International', brand: 'JT Baker', esclusiva: true },
  { distributore: 'VWR International', brand: 'Leica', esclusiva: false },
  { distributore: 'VWR International', brand: 'MP Biomedicals', esclusiva: false },
  { distributore: 'VWR International', brand: 'Merck', esclusiva: false },
  { distributore: 'VWR International', brand: 'Molecular Devices', esclusiva: false },
  { distributore: 'VWR International', brand: 'Novus', esclusiva: false },
  { distributore: 'VWR International', brand: 'Omega Bio-tek', esclusiva: false },
  { distributore: 'VWR International', brand: 'OriGene', esclusiva: false },
  { distributore: 'VWR International', brand: 'Oxford Nanopore', esclusiva: false },
  { distributore: 'VWR International', brand: 'PHCBI', esclusiva: false },
  { distributore: 'VWR International', brand: 'Pall', esclusiva: false },
  { distributore: 'VWR International', brand: 'PanReac AppliChem', esclusiva: false },
  { distributore: 'VWR International', brand: 'Polyplus', esclusiva: false },
  { distributore: 'VWR International', brand: 'QuantaBio', esclusiva: true },
  { distributore: 'VWR International', brand: 'Sartorius', esclusiva: false },
  { distributore: 'VWR International', brand: 'Spectrum Chemicals', esclusiva: false },
  { distributore: 'VWR International', brand: 'TCI', esclusiva: false },
  { distributore: 'VWR International', brand: 'Tecan', esclusiva: false },
  { distributore: 'VWR International', brand: 'Thermo Fisher Scientific', esclusiva: false },
  { distributore: 'VWR International', brand: 'Trilink Biotechnologies', esclusiva: false },
  { distributore: 'VWR International', brand: 'US Biological', esclusiva: false },
  { distributore: 'VWR International', brand: 'VWR Collection', esclusiva: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SMART MATCHING ENGINE (no AI needed)
// ═══════════════════════════════════════════════════════════════════════════════

function smartCategoryMatch(description) {
  const q = description.toLowerCase().trim();
  const words = q.split(/[\s,.\-\/()]+/).filter(w => w.length > 1);
  const scored = [];

  for (const [key, keywords] of Object.entries(categoryKeywords)) {
    const [famiglia, sottofamiglia] = key.split('|');
    let score = 0;

    // Check keyword matches
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length; // longer match = higher score
      }
    }

    // Check direct match in sottofamiglia text
    const sf = sottofamiglia.toLowerCase();
    for (const word of words) {
      if (sf.includes(word) && word.length > 2) score += 3;
    }
    if (sf.includes(q)) score += 20;

    // Check famiglia match
    if (famiglia.toLowerCase().includes(q) || q.includes(famiglia.toLowerCase())) score += 5;

    if (score > 0) {
      scored.push({ famiglia, sottofamiglia, score });
    }
  }

  // Also do direct text search on all categories
  for (const cat of categories) {
    const sf = cat.sottofamiglia.toLowerCase();
    const fm = cat.famiglia.toLowerCase();
    const key = `${cat.famiglia}|${cat.sottofamiglia}`;
    if (scored.find(s => `${s.famiglia}|${s.sottofamiglia}` === key)) continue;

    let score = 0;
    for (const word of words) {
      if (sf.includes(word) && word.length > 2) score += 3;
      if (fm.includes(word) && word.length > 2) score += 2;
    }
    if (score > 0) {
      scored.push({ famiglia: cat.famiglia, sottofamiglia: cat.sottofamiglia, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => ({
    famiglia: s.famiglia,
    sottofamiglia: s.sottofamiglia,
    confidenza: Math.min(10, Math.round(s.score / 3) + 5),
    spiegazione: `Match basato su parole chiave (score: ${s.score})`
  }));
}

function smartBrandSearch(query) {
  const q = query.toLowerCase().trim();

  // 1. Direct match in brand names
  let matches = distributorBrands.filter(b => b.brand.toLowerCase().includes(q));

  // 2. If no match, check aliases
  if (matches.length === 0) {
    const aliasKey = Object.keys(brandAliases).find(k => q.includes(k) || k.includes(q));
    if (aliasKey) {
      const brandNames = brandAliases[aliasKey];
      matches = distributorBrands.filter(b =>
        brandNames.some(bn => b.brand.toLowerCase().includes(bn.toLowerCase()) || bn.toLowerCase().includes(b.brand.toLowerCase()))
      );
    }
  }

  // 3. Fuzzy: check if any word matches
  if (matches.length === 0) {
    const words = q.split(/[\s\-\/]+/).filter(w => w.length > 2);
    matches = distributorBrands.filter(b => {
      const bl = b.brand.toLowerCase();
      return words.some(w => bl.includes(w) || w.includes(bl));
    });
  }

  return matches.map(m => {
    const dist = distributors.find(d =>
      d.nome.toLowerCase().includes(m.distributore.toLowerCase()) ||
      m.distributore.toLowerCase().includes(d.nome.toLowerCase())
    );
    return { ...m, condizioni: dist || null };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/stats', (req, res) => {
  const famiglie = [...new Set(categories.map(c => c.famiglia))];
  res.json({
    categorie: categories.length,
    famiglie: famiglie.length,
    distributori: distributors.length,
    brand_mappings: distributorBrands.length,
  });
});

app.get('/api/categories', (req, res) => res.json(categories));

// Deep Category Matcher — ricerca nei database scientifici
app.post('/api/categories/match', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Descrizione richiesta' });

  try {
    const result = await deepProductSearch(description);

    if (result.suggerimenti.length === 0) {
      return res.json({
        suggerimenti: [{
          famiglia: 'N/A',
          sottofamiglia: 'Nessuna corrispondenza trovata',
          confidenza: 0,
          spiegazione: 'Prodotto non trovato nei database scientifici (PubChem, UniProt, Europe PMC). Prova con il nome completo del prodotto.'
        }],
        fonti: result.fonti,
        tempo: result.tempo
      });
    }

    res.json({
      suggerimenti: result.suggerimenti,
      fonti: result.fonti,
      productInfo: result.productInfo,
      tempo: result.tempo
    });
  } catch (err) {
    console.error('Search error:', err.message);
    // Fallback a keyword matching
    const suggerimenti = smartCategoryMatch(description);
    res.json({
      suggerimenti: suggerimenti.length ? suggerimenti : [{
        famiglia: 'N/A', sottofamiglia: 'Errore nella ricerca', confidenza: 0,
        spiegazione: 'Errore durante la ricerca nei database. Risultato basato solo su keyword matching.'
      }],
      fonti: ['Fallback: solo keyword matching (errore connessione database)']
    });
  }
});

// Distributors
app.get('/api/distributors', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const results = q ? distributors.filter(d => d.nome.toLowerCase().includes(q)) : distributors;
  res.json(results);
});

app.get('/api/distributors/:nome/brands', (req, res) => {
  const nome = req.params.nome.toLowerCase();
  const dist = distributors.find(d => d.nome.toLowerCase().includes(nome));
  const brands = distributorBrands.filter(b => b.distributore.toLowerCase().includes(nome));
  res.json({ condizioni: dist || null, brands });
});

// Smart Brand Search (with alias resolution)
app.get('/api/brands/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Query richiesta' });
  const trovati = smartBrandSearch(q);
  res.json({ trovati, tipo: trovati.length ? 'match' : 'nessun_risultato' });
});

// Cerca Distributore (ex Alternative Hunter)
app.post('/api/cerca-distributore', (req, res) => {
  const { brand } = req.body;
  if (!brand?.trim()) return res.status(400).json({ error: 'Brand richiesto' });
  const trovati = smartBrandSearch(brand);
  if (trovati.length > 0) {
    return res.json({ brand: trovati[0].brand, distributori: trovati, tipo: 'trovato' });
  }
  res.json({ trovati: [], tipo: 'nessun_risultato', messaggio: 'Brand non trovato nel database. Prova con un nome diverso o abbreviazione.' });
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TIGEM Acquisti Tool - porta ${PORT}`));
