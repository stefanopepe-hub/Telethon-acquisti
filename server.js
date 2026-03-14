const express = require('express');
const path = require('path');

let anthropic = null;
try {
  const Anthropic = require('@anthropic-ai/sdk');
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    console.log('Anthropic AI attivo');
  } else {
    console.log('ANTHROPIC_API_KEY non configurata - AI matching disabilitato');
  }
} catch (e) {
  console.log('Anthropic SDK non disponibile - AI matching disabilitato');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════════════════
// DATI INTEGRATI — Categorie merceologiche Alyante
// ═══════════════════════════════════════════════════════════════════════════════

const categories = [
  // 1. Plasticware
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
  // 2. Glassware
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Bottle' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Beute Erlenmeyer' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Microtube' },
  { numero: 2, famiglia: 'Glassware', sottofamiglia: 'Glass slides (vetrini) - portaoggetto, coprioggetto' },
  // 3. Disposable
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'PROTEZIONE: camici, calzari, sopracalzari, guanti nitrile, guanti lattice' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'BUSTE BIOHAZARD RIFIUTI SPECIALI' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'CONSERVAZIONE CAMPIONI: contenitori PCR, cryoboxes, Parafilm, box' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'Disposable generale: nastro autoclave, carta da banco, cartine pH, spruzzette, pinze, aghi, lame, siringhe, anse, detergenti, alcool' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'Rotoli carta' },
  { numero: 3, famiglia: 'Disposable', sottofamiglia: 'Sicurezza' },
  // 4. Cancelleria & Stampati
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Cancelleria' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Materiale generico vario' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Riviste' },
  { numero: 4, famiglia: 'Cancelleria & Stampati', sottofamiglia: 'Pubblicazioni' },
  // 5a. Equipments e Arredi
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Apparecchiatura Elettronica: microscopi, fotodocumentazione (Gel Doc, Chemidoc), pHmetri, spettrofotometri, power supply, bilance, cell counter, FACS, luminometro/fluorimetro' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Apparecchiatura Meccanica: centrifughe, ultracentrifughe, vortex, robot liquid handling' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Apparecchiatura Termoregolatore: freezer, frigoriferi, thermomixer, contenitore criogenico (azoto liquido), bagnetti termostatati, stufe, PCR, real time, incubatori, produttori ghiaccio, autoclavi, stirrer' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Arredi Ufficio' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Arredi Laboratorio' },
  { numero: 5, famiglia: 'Equipments e Arredi', sottofamiglia: 'Taratura, PQ, IQ, OQ - Maintenance' },
  // 5b. IT
  { numero: 5, famiglia: 'IT', sottofamiglia: 'PC' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Software' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Manutenzione software' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Materiale informatico: laptop, desktop, mouse, stampanti, toner' },
  { numero: 5, famiglia: 'IT', sottofamiglia: 'Manutenzione hardware' },
  // 6. Lab Reagents
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'KIT: estrazione, purificazione, luciferase assay, kit vitalita, ELISA, enrichment, depletion' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'PCR: taq, dye, agarosio, DNA/RNA marker' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'REAL TIME PCR: sybr green, mastermix, taqman, probes' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'NGS: preparazione librerie, purificazione, frammentazione' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'CLONING: cellule competenti, kit clonaggio' },
  { numero: 6, famiglia: 'Lab Reagents', sottofamiglia: 'ENZIMI: restrizione, modifica' },
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
  // 7. Animal Housing
  { numero: 7, famiglia: 'Animal Housing', sottofamiglia: 'Acquisto animali' },
  { numero: 7, famiglia: 'Animal Housing', sottofamiglia: 'Materiali di consumo' },
  { numero: 7, famiglia: 'Animal Housing', sottofamiglia: 'Stabulazione' },
  // 8. Servizi
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
// DATI INTEGRATI — Distributori e condizioni
// ═══════════════════════════════════════════════════════════════════════════════

const distributors = [
  { nome: 'Beckman Coulter Srl', min_ordine: '/', spese_spedizione: '50 \u20ac', spese_ghiaccio_secco: '/' },
  { nome: 'Bio-Techne s.r.l.', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '50 \u20ac' },
  { nome: 'Campoverde', min_ordine: '/', spese_spedizione: '42 \u20ac (nulle su Milano)', spese_ghiaccio_secco: '15 \u20ac' },
  { nome: 'D.B.A.', min_ordine: '/', spese_spedizione: '\u20ac 20 (+IVA) per ordini < \u20ac 500', spese_ghiaccio_secco: '30 \u20ac' },
  { nome: 'Diatech Lab Line srl', min_ordine: '150 \u20ac', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'D.I.D. Diagnostic International Distribution Spa', min_ordine: '/', spese_spedizione: '\u20ac 40 per ordini < \u20ac 350', spese_ghiaccio_secco: '25 \u20ac' },
  { nome: 'Eppendorf', min_ordine: '/', spese_spedizione: '\u20ac 35 (+IVA) per ordini < \u20ac 500', spese_ghiaccio_secco: '/' },
  { nome: 'Gilson Italia s.r.l.', min_ordine: '300 \u20ac', spese_spedizione: '\u20ac 50 (+IVA) per ordini < \u20ac 500', spese_ghiaccio_secco: '/' },
  { nome: 'MedChemTronica', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Qiagen', min_ordine: '/', spese_spedizione: '\u20ac 40 (+IVA) per ordini < \u20ac 1000; \u20ac 38 per ordini < \u20ac 400', spese_ghiaccio_secco: '24 \u20ac' },
  { nome: 'Sarstedt', min_ordine: 'superiore a 200 \u20ac (IVA esclusa)', spese_spedizione: '\u20ac 25 (+IVA) per ordini < \u20ac 300', spese_ghiaccio_secco: '/' },
  { nome: 'Tema Ricerca', min_ordine: '/', spese_spedizione: '\u20ac 20 (+IVA) per ordini < \u20ac 400', spese_ghiaccio_secco: '30 \u20ac' },
  { nome: 'Bio-Rad', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Promega', min_ordine: '/', spese_spedizione: '\u20ac 50 (+IVA) per ordini < \u20ac 400', spese_ghiaccio_secco: '\u20ac 30 (+IVA) per ordini < \u20ac 400' },
  { nome: 'AGILENT TECHNOLOGIES ITALIA SPA', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'Carlo Erba Reagents Srl', min_ordine: '50 \u20ac', spese_spedizione: 'CONTR.SPESE: 50-200\u20ac=\u20ac65+IVA; 200-500\u20ac=\u20ac48+IVA; HORIZON=\u20ac40+IVA; METABION=\u20ac18+IVA', spese_ghiaccio_secco: 'Ghiaccio secco \u20ac30+IVA; CPA \u20ac70+IVA' },
  { nome: 'Euroclone S.p.A.', min_ordine: '150 \u20ac', spese_spedizione: '/', spese_ghiaccio_secco: 'Nessuna (eccetto azoto liquido dewar: 450 \u20ac)' },
  { nome: 'Merck Life Science S.R.L.', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '55 \u20ac' },
  { nome: 'REVVITY ITALIA SPA', min_ordine: '/', spese_spedizione: 'variabile', spese_ghiaccio_secco: 'variabile' },
  { nome: 'SARTORIUS ITALY SRL', min_ordine: '/', spese_spedizione: '28 \u20ac (per ordini < 500 \u20ac)', spese_ghiaccio_secco: '/' },
  { nome: 'S.I.A.L. S.r.l.', min_ordine: '/', spese_spedizione: '20 \u20ac per ordini < 200 \u20ac', spese_ghiaccio_secco: '20 \u20ac per ordini < 200 \u20ac' },
  { nome: 'VWR International S.r.l.', min_ordine: 'min 400 \u20ac, altrimenti \u20ac30 gestione', spese_spedizione: '<400\u20ac: \u20ac30; >400\u20ac: gratuito', spese_ghiaccio_secco: '/' },
  { nome: 'Starlab', min_ordine: '100 \u20ac', spese_spedizione: '\u20ac 40 per ordini < \u20ac 400', spese_ghiaccio_secco: '/' },
  { nome: 'Twin Helix srl', min_ordine: '100 \u20ac', spese_spedizione: '\u20ac 25 per ordini < \u20ac 250', spese_ghiaccio_secco: '30 \u20ac' },
  { nome: '2Biological Instruments', min_ordine: '150 \u20ac', spese_spedizione: '\u20ac 25 per ordini < \u20ac 500', spese_ghiaccio_secco: '/' },
  { nome: 'Aurogene', min_ordine: '500 \u20ac', spese_spedizione: '\u20ac 25 (+IVA) per ordini < \u20ac 500', spese_ghiaccio_secco: '/' },
  { nome: 'Life Technologies (ThermoFisher)', min_ordine: '/', spese_spedizione: '<\u20ac2000: \u20ac48+IVA; Hazardous: \u20ac48+IVA; Oligo tubi: \u20ac12+IVA; Oligo piastre: \u20ac70+IVA', spese_ghiaccio_secco: '\u20ac 48+IVA' },
  { nome: 'Roche', min_ordine: '/', spese_spedizione: '\u20ac 30 per ordini < \u20ac 300', spese_ghiaccio_secco: '/' },
  { nome: 'Illumina', min_ordine: '/', spese_spedizione: '150 \u20ac', spese_ghiaccio_secco: '/' },
  { nome: 'TebuBio', min_ordine: '/', spese_spedizione: '\u20ac 30 (+IVA) per ordini < \u20ac 100; assicurazione >10.000\u20ac', spese_ghiaccio_secco: '\u20ac 52 ghiaccio secco; \u20ac 255 azoto liquido' },
  { nome: 'Miltenyi', min_ordine: '/', spese_spedizione: '\u20ac 35 (+IVA) per ordini < \u20ac 500', spese_ghiaccio_secco: '/' },
  { nome: 'BECTON DICKINSON ITALIA S.p.A.', min_ordine: '/', spese_spedizione: '\u20ac50+IVA standard; \u20ac75+IVA espresso; \u20ac35 ordini <\u20ac1000', spese_ghiaccio_secco: '/' },
  { nome: 'Eurofins Genomics Italy S.r.l.', min_ordine: '/', spese_spedizione: 'gratuite', spese_ghiaccio_secco: '/' },
  { nome: 'LGC Standards', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'PRODOTTI GIANNI', min_ordine: '/', spese_spedizione: '\u20ac29 gestione; gratis >600\u20ac', spese_ghiaccio_secco: 'Temp amb/wet ice: 0\u20ac; Dry ice: 20\u20ac; DataLogger: 60\u20ac; HAZARD: 40\u20ac' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DATI INTEGRATI — Brand distribuiti (distributore -> brand, esclusiva)
// ═══════════════════════════════════════════════════════════════════════════════

const distributorBrands = [
  // D.B.A.
  { distributore: 'D.B.A.', brand: 'VectorLabs', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'SYNAPTIC SYSTEMS (SYSY)', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'CLOUD CLONE', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Applichem', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PTGLAB', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'BIORBYT', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'MEDCHEM', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'ASSAYGENIE', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PEPROTECH', esclusiva: false },
  // Agilent
  { distributore: 'Agilent', brand: 'Agilent', esclusiva: true },
  // Aurogene (esclusiva)
  { distributore: 'Aurogene', brand: 'InvivoGen', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Selleck', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Diagenode', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Cytek', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Bioss', esclusiva: true },
  { distributore: 'Aurogene', brand: 'OZBioscience', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Zymo', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Mabtech', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Abclonal', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Akadeum', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Bioline', esclusiva: true },
  { distributore: 'Aurogene', brand: 'CellGS', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Azure', esclusiva: true },
  { distributore: 'Aurogene', brand: 'Advasta', esclusiva: true },
  // Aurogene (non esclusiva)
  { distributore: 'Aurogene', brand: 'Biotium', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Innovative', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Cusabio', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Santa Cruz', esclusiva: false },
  { distributore: 'Aurogene', brand: 'SouthernBiotech', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Bethyl', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Biolegend', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Cell Signaling', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Biowest', esclusiva: false },
  // BECKMAN COULTER
  { distributore: 'BECKMAN COULTER S.r.L.', brand: 'Beckman Coulter', esclusiva: true },
  // Bio-Rad
  { distributore: 'Bio-Rad', brand: 'Bio-Rad', esclusiva: true },
  // Bio-Techne
  { distributore: 'Bio-Techne', brand: 'ELLA cartridges', esclusiva: false },
  { distributore: 'Bio-Techne', brand: 'ACD', esclusiva: false },
  // Campoverde
  { distributore: 'Campoverde srl', brand: 'BioLegend', esclusiva: false },
  { distributore: 'Campoverde srl', brand: 'Arrow Biotech', esclusiva: false },
  // Diatech Lab Line (esclusiva)
  { distributore: 'Diatech Lab Line srl', brand: 'Takara Bio Inc.', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Bruker Spatial Biology', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Mission Bio', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'DeNovix', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Twist Bioscience', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Watchmaker Genomics', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Singleron Biotechnologies', esclusiva: true },
  // Diatech Lab Line (non esclusiva)
  { distributore: 'Diatech Lab Line srl', brand: 'Grant Instruments', esclusiva: false },
  { distributore: 'Diatech Lab Line srl', brand: 'Biosan', esclusiva: false },
  // D.I.D.
  { distributore: 'D.I.D.', brand: 'StemCell Technologies', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'MBL', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Minerva Biolabs', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Biolamina', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Biowest', esclusiva: true },
  // Carlo Erba (esclusiva)
  { distributore: 'Carlo Erba Reagents', brand: 'Carlo Erba Reagents', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'FASTER', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'METABION', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'MICROSYNTH', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'VIZGEN', esclusiva: true },
  // Carlo Erba (non esclusiva)
  { distributore: 'Carlo Erba Reagents', brand: 'MACHEREY NAGEL', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'HORIZON / DHARMACON', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Thermo Fisher (ACROS, ALFA AESAR)', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'PROMOCELL', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'SOLIS BIODYNE', esclusiva: false },
  // Euroclone (esclusiva)
  { distributore: 'Euroclone S.p.A.', brand: '10X Genomics', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'BMG Labtech', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'Cell Signaling Technology', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'Covaris', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'LONZA', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'MGI', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'NEW ENGLAND BIOLABS', esclusiva: true },
  // Euroclone (non esclusiva)
  { distributore: 'Euroclone S.p.A.', brand: 'Corning - Falcon', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Cytiva - GEA', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Greiner BioOne', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Jackson ImmunoResearch', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Polyplus-Transfection', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Roche', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Zymo', esclusiva: false },
  // Gilson
  { distributore: 'GILSON', brand: 'GILSON', esclusiva: true },
  // Merck
  { distributore: 'Merck Life Science', brand: 'Merck/SigmaAldrich/Millipore', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Corning/Falcon/Axygen', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Cytiva/Whatman', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Eppendorf', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Roche/KAPA', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Greiner', esclusiva: false },
  // Revvity
  { distributore: 'Revvity Italia', brand: 'Revvity Inc.', esclusiva: true },
  // Sartorius
  { distributore: 'SARTORIUS ITALY', brand: 'SARTORIUS', esclusiva: true },
  // SIAL (esclusiva)
  { distributore: 'SIAL', brand: 'Analytik Jena', esclusiva: true },
  { distributore: 'SIAL', brand: 'UVITEC', esclusiva: true },
  { distributore: 'SIAL', brand: 'Charles River', esclusiva: true },
  // SIAL (non esclusiva)
  { distributore: 'SIAL', brand: 'BD', esclusiva: false },
  { distributore: 'SIAL', brand: 'EPPENDORF', esclusiva: false },
  { distributore: 'SIAL', brand: 'GILSON', esclusiva: false },
  { distributore: 'SIAL', brand: 'Thermo Fisher Scientific', esclusiva: false },
  { distributore: 'SIAL', brand: 'BIO-RAD', esclusiva: false },
  { distributore: 'SIAL', brand: 'MERCK', esclusiva: false },
  { distributore: 'SIAL', brand: 'CORNING', esclusiva: false },
  // Starlab
  { distributore: 'Starlab srl', brand: 'Starlab', esclusiva: true },
  // Tema Ricerca (esclusiva)
  { distributore: 'TEMA RICERCA', brand: 'IDT', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'ORIGENE', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'CELLECTA', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'EPIGENTEK', esclusiva: true },
  // Tema Ricerca (non esclusiva)
  { distributore: 'TEMA RICERCA', brand: 'BETHYL', esclusiva: false },
  { distributore: 'TEMA RICERCA', brand: 'MIRUS', esclusiva: false },
  { distributore: 'TEMA RICERCA', brand: 'LUCIGEN', esclusiva: false },
  { distributore: 'TEMA RICERCA', brand: 'ELABSCIENCE', esclusiva: false },
  // Twin Helix (esclusiva)
  { distributore: 'Twin Helix srl', brand: 'Logos Biosystems', esclusiva: true },
  { distributore: 'Twin Helix srl', brand: 'highQu GmbH', esclusiva: true },
  { distributore: 'Twin Helix srl', brand: 'Ibidi', esclusiva: true },
  // Twin Helix (non esclusiva)
  { distributore: 'Twin Helix srl', brand: 'IBA Lifesciences', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'Genscript', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'TargetMol', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'Repligen', esclusiva: false },
  // VWR (esclusiva)
  { distributore: 'VWR International', brand: 'Avantor', esclusiva: true },
  { distributore: 'VWR International', brand: 'JT Baker', esclusiva: true },
  { distributore: 'VWR International', brand: 'QuantaBio', esclusiva: true },
  { distributore: 'VWR International', brand: 'VWR Collection', esclusiva: true },
  // VWR (non esclusiva)
  { distributore: 'VWR International', brand: 'Agilent', esclusiva: false },
  { distributore: 'VWR International', brand: 'Beckman Coulter', esclusiva: false },
  { distributore: 'VWR International', brand: 'Corning', esclusiva: false },
  { distributore: 'VWR International', brand: 'Eppendorf', esclusiva: false },
  { distributore: 'VWR International', brand: 'Merck', esclusiva: false },
  { distributore: 'VWR International', brand: 'Sartorius', esclusiva: false },
  { distributore: 'VWR International', brand: 'Thermo Fisher Scientific', esclusiva: false },
  { distributore: 'VWR International', brand: 'Oxford Nanopore', esclusiva: false },
  // Promega
  { distributore: 'PROMEGA', brand: 'Promega', esclusiva: true },
  // Sarstedt
  { distributore: 'SARSTEDT', brand: 'Sarstedt', esclusiva: true },
  // Miltenyi
  { distributore: 'MILTENYI', brand: 'Miltenyi', esclusiva: true },
  // TebuBio (esclusiva)
  { distributore: 'TEBUBIO', brand: 'Trilink Biotechnologies', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'EpiCypher', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'Signagen Laboratories', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'Synbio Technologies', esclusiva: true },
  // TebuBio (non esclusiva)
  { distributore: 'TEBUBIO', brand: 'Peprotech', esclusiva: false },
  { distributore: 'TEBUBIO', brand: 'BPS Bioscience', esclusiva: false },
  { distributore: 'TEBUBIO', brand: 'Raybiotech', esclusiva: false },
  { distributore: 'TEBUBIO', brand: 'Genecopoeia', esclusiva: false },
  // 2Biological
  { distributore: '2BIOLOGICAL', brand: 'FINE SCIENCE TOOLS', esclusiva: true },
  // BD
  { distributore: 'BECTON DICKINSON', brand: 'BD', esclusiva: true },
  // Eppendorf
  { distributore: 'EPPENDORF', brand: 'EPPENDORF', esclusiva: true },
  // Eurofins
  { distributore: 'EUROFINS GENOMICS', brand: 'EUROFINS GENOMICS', esclusiva: true },
  // Illumina
  { distributore: 'ILLUMINA', brand: 'ILLUMINA', esclusiva: true },
  // LGC
  { distributore: 'LGC STANDARDS', brand: 'ATCC', esclusiva: true },
  // Life Technologies
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'Life Technologies', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'PEPROTECH', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'GIBCO', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'APPLIED BIOSYSTEM', esclusiva: true },
  // Qiagen
  { distributore: 'QIAGEN', brand: 'QIAGEN', esclusiva: true },
  // Prodotti Gianni (esclusiva)
  { distributore: 'PRODOTTI GIANNI', brand: 'Abcam', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Sino Biological', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Lexogen', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Capricorn Scientific', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Genetex', esclusiva: true },
  // Prodotti Gianni (non esclusiva)
  { distributore: 'PRODOTTI GIANNI', brand: 'Jackson ImmunoResearch', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Raybiotech', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'TargetMol', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Origene', esclusiva: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const famiglie = [...new Set(categories.map(c => c.famiglia))];
  res.json({
    categorie: categories.length,
    famiglie: famiglie.length,
    distributori: distributors.length,
    brand_mappings: distributorBrands.length,
  });
});

// Categories list (grouped by famiglia)
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

// AI Category Matcher
app.post('/api/categories/match', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Descrizione richiesta' });

  const catList = categories
    .map(c => `[${c.numero}] "${c.famiglia}" > "${c.sottofamiglia}"`)
    .join('\n');

  const prompt = `Sei un esperto di acquisti per un istituto di ricerca biomedica (TIGEM - Fondazione Telethon).
Categorie merceologiche Alyante disponibili:

${catList}

Prodotto/servizio da classificare: "${description}"

Suggerisci le 1-3 categorie piu appropriate. Rispondi SOLO con JSON:
{"suggerimenti":[{"famiglia":"...","sottofamiglia":"...","confidenza":9,"spiegazione":"..."}]}`;

  if (!anthropic) {
    // Fallback: ricerca testuale senza AI
    const q = description.toLowerCase();
    const matches = categories.filter(c =>
      c.sottofamiglia.toLowerCase().includes(q) || c.famiglia.toLowerCase().includes(q)
    ).slice(0, 3);
    return res.json({ suggerimenti: matches.map(m => ({
      famiglia: m.famiglia, sottofamiglia: m.sottofamiglia,
      confidenza: 7, spiegazione: 'Ricerca testuale (AI non configurata)'
    }))});
  }

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

// Distributors list (with search)
app.get('/api/distributors', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const results = q
    ? distributors.filter(d => d.nome.toLowerCase().includes(q))
    : distributors;
  res.json(results);
});

// Distributor detail with brands
app.get('/api/distributors/:nome/brands', (req, res) => {
  const nome = req.params.nome.toLowerCase();
  const dist = distributors.find(d => d.nome.toLowerCase().includes(nome));
  const brands = distributorBrands.filter(b => b.distributore.toLowerCase().includes(nome));
  res.json({ condizioni: dist || null, brands });
});

// Brand search — trova distributore per brand
app.get('/api/brands/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.status(400).json({ error: 'Query richiesta' });

  const matches = distributorBrands.filter(b => b.brand.toLowerCase().includes(q));
  const results = matches.map(m => {
    const dist = distributors.find(d =>
      d.nome.toLowerCase().includes(m.distributore.toLowerCase()) ||
      m.distributore.toLowerCase().includes(d.nome.toLowerCase())
    );
    return { ...m, condizioni: dist || null };
  });

  res.json({ trovati: results, tipo: results.length ? 'match_diretto' : 'nessun_risultato' });
});

// Alternative Hunter — trova distributori alternativi
app.post('/api/alternative-hunter', async (req, res) => {
  const { brand } = req.body;
  if (!brand?.trim()) return res.status(400).json({ error: 'Brand richiesto' });

  const q = brand.toLowerCase();
  const matches = distributorBrands.filter(b => b.brand.toLowerCase().includes(q));

  if (matches.length > 0) {
    const results = matches.map(m => {
      const dist = distributors.find(d =>
        d.nome.toLowerCase().includes(m.distributore.toLowerCase()) ||
        m.distributore.toLowerCase().includes(d.nome.toLowerCase())
      );
      return { ...m, condizioni: dist || null };
    });
    return res.json({ brand: matches[0].brand, distributori: results, tipo: 'trovato' });
  }

  // AI fallback
  if (anthropic) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `Sei un esperto procurement life science. Il brand "${brand}" non e nel nostro database. Suggerisci 3-5 alternative (brand simili). JSON: {"alternative":[{"brand":"...","motivo":"..."}]}` }]
      });
      const text = message.content[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return res.json({ ...JSON.parse(jsonMatch[0]), tipo: 'ai_alternative' });
    } catch (_) {}
  }

  res.json({ trovati: [], tipo: 'nessun_risultato' });
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TIGEM Acquisti Tool - porta ${PORT}`));
