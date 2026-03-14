const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  'Lab Reagents|ENZIMI: restrizione, modifica': ['enzima restrizione', 'restriction enzyme', 'ecori', 'bamhi', 'hindiii', 'xhoi', 'noti', 'ligase', 'fosfatasi', 'chinasi', 'phosphatase', 'kinase'],
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
  { nome: 'Carlo Erba Reagents Srl', min_ordine: '50 \u20ac', spese_spedizione: '50-200\u20ac=\u20ac65+IVA; 200-500\u20ac=\u20ac48+IVA; HORIZON=\u20ac40; METABION=\u20ac18', spese_ghiaccio_secco: 'Ghiaccio secco \u20ac30+IVA; CPA \u20ac70+IVA' },
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
  { nome: 'Life Technologies (ThermoFisher)', min_ordine: '/', spese_spedizione: '<\u20ac2000: \u20ac48+IVA; Hazard: \u20ac48; Oligo tubi: \u20ac12; Oligo piastre: \u20ac70', spese_ghiaccio_secco: '\u20ac 48+IVA' },
  { nome: 'Roche', min_ordine: '/', spese_spedizione: '\u20ac 30 per ordini < \u20ac 300', spese_ghiaccio_secco: '/' },
  { nome: 'Illumina', min_ordine: '/', spese_spedizione: '150 \u20ac', spese_ghiaccio_secco: '/' },
  { nome: 'TebuBio', min_ordine: '/', spese_spedizione: '\u20ac 30 (+IVA) per ordini < \u20ac 100', spese_ghiaccio_secco: '\u20ac 52 ghiaccio; \u20ac 255 azoto liquido' },
  { nome: 'Miltenyi', min_ordine: '/', spese_spedizione: '\u20ac 35 (+IVA) per ordini < \u20ac 500', spese_ghiaccio_secco: '/' },
  { nome: 'BECTON DICKINSON ITALIA S.p.A.', min_ordine: '/', spese_spedizione: '\u20ac50+IVA std; \u20ac75+IVA espresso; \u20ac35 ordini <\u20ac1000', spese_ghiaccio_secco: '/' },
  { nome: 'Eurofins Genomics Italy S.r.l.', min_ordine: '/', spese_spedizione: 'gratuite', spese_ghiaccio_secco: '/' },
  { nome: 'LGC Standards', min_ordine: '/', spese_spedizione: '/', spese_ghiaccio_secco: '/' },
  { nome: 'PRODOTTI GIANNI', min_ordine: '/', spese_spedizione: '\u20ac29 gestione; gratis >600\u20ac', spese_ghiaccio_secco: 'Dry ice: 20\u20ac; DataLogger: 60\u20ac; HAZARD: 40\u20ac' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DATI — Brand distribuiti
// ═══════════════════════════════════════════════════════════════════════════════

const distributorBrands = [
  { distributore: 'D.B.A.', brand: 'VectorLabs', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'SYNAPTIC SYSTEMS (SYSY)', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'CLOUD CLONE', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'Applichem', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PTGLAB', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'BIORBYT', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'MEDCHEM', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'ASSAYGENIE', esclusiva: false },
  { distributore: 'D.B.A.', brand: 'PEPROTECH', esclusiva: false },
  { distributore: 'Agilent', brand: 'Agilent', esclusiva: true },
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
  { distributore: 'Aurogene', brand: 'Biotium', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Santa Cruz', esclusiva: false },
  { distributore: 'Aurogene', brand: 'SouthernBiotech', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Bethyl', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Biolegend', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Cell Signaling', esclusiva: false },
  { distributore: 'Aurogene', brand: 'Biowest', esclusiva: false },
  { distributore: 'BECKMAN COULTER S.r.L.', brand: 'Beckman Coulter', esclusiva: true },
  { distributore: 'Bio-Rad', brand: 'Bio-Rad', esclusiva: true },
  { distributore: 'Bio-Techne', brand: 'ELLA cartridges', esclusiva: false },
  { distributore: 'Bio-Techne', brand: 'ACD', esclusiva: false },
  { distributore: 'Campoverde srl', brand: 'BioLegend', esclusiva: false },
  { distributore: 'Campoverde srl', brand: 'Arrow Biotech', esclusiva: false },
  { distributore: 'Diatech Lab Line srl', brand: 'Takara Bio Inc.', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Bruker Spatial Biology', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Mission Bio', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'DeNovix', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Twist Bioscience', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Watchmaker Genomics', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Singleron Biotechnologies', esclusiva: true },
  { distributore: 'Diatech Lab Line srl', brand: 'Grant Instruments', esclusiva: false },
  { distributore: 'Diatech Lab Line srl', brand: 'Biosan', esclusiva: false },
  { distributore: 'D.I.D.', brand: 'StemCell Technologies', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'MBL', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Minerva Biolabs', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Biolamina', esclusiva: true },
  { distributore: 'D.I.D.', brand: 'Biowest', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'Carlo Erba Reagents', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'FASTER', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'METABION', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'MICROSYNTH', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'VIZGEN', esclusiva: true },
  { distributore: 'Carlo Erba Reagents', brand: 'MACHEREY NAGEL', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'HORIZON / DHARMACON', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'Thermo Fisher (ACROS, ALFA AESAR)', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'PROMOCELL', esclusiva: false },
  { distributore: 'Carlo Erba Reagents', brand: 'SOLIS BIODYNE', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: '10X Genomics', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'BMG Labtech', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'Cell Signaling Technology', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'Covaris', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'LONZA', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'MGI', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'NEW ENGLAND BIOLABS', esclusiva: true },
  { distributore: 'Euroclone S.p.A.', brand: 'Corning - Falcon', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Cytiva - GEA', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Greiner BioOne', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Jackson ImmunoResearch', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Polyplus-Transfection', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Roche', esclusiva: false },
  { distributore: 'Euroclone S.p.A.', brand: 'Zymo', esclusiva: false },
  { distributore: 'GILSON', brand: 'GILSON', esclusiva: true },
  { distributore: 'Merck Life Science', brand: 'Merck/SigmaAldrich/Millipore', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Corning/Falcon/Axygen', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Cytiva/Whatman', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Eppendorf', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Roche/KAPA', esclusiva: false },
  { distributore: 'Merck Life Science', brand: 'Greiner', esclusiva: false },
  { distributore: 'Revvity Italia', brand: 'Revvity Inc.', esclusiva: true },
  { distributore: 'SARTORIUS ITALY', brand: 'SARTORIUS', esclusiva: true },
  { distributore: 'SIAL', brand: 'Analytik Jena', esclusiva: true },
  { distributore: 'SIAL', brand: 'UVITEC', esclusiva: true },
  { distributore: 'SIAL', brand: 'Charles River', esclusiva: true },
  { distributore: 'SIAL', brand: 'BD', esclusiva: false },
  { distributore: 'SIAL', brand: 'EPPENDORF', esclusiva: false },
  { distributore: 'SIAL', brand: 'GILSON', esclusiva: false },
  { distributore: 'SIAL', brand: 'Thermo Fisher Scientific', esclusiva: false },
  { distributore: 'SIAL', brand: 'BIO-RAD', esclusiva: false },
  { distributore: 'SIAL', brand: 'MERCK', esclusiva: false },
  { distributore: 'SIAL', brand: 'CORNING', esclusiva: false },
  { distributore: 'Starlab srl', brand: 'Starlab', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'IDT', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'ORIGENE', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'CELLECTA', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'EPIGENTEK', esclusiva: true },
  { distributore: 'TEMA RICERCA', brand: 'BETHYL', esclusiva: false },
  { distributore: 'TEMA RICERCA', brand: 'MIRUS', esclusiva: false },
  { distributore: 'TEMA RICERCA', brand: 'LUCIGEN', esclusiva: false },
  { distributore: 'TEMA RICERCA', brand: 'ELABSCIENCE', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'Logos Biosystems', esclusiva: true },
  { distributore: 'Twin Helix srl', brand: 'highQu GmbH', esclusiva: true },
  { distributore: 'Twin Helix srl', brand: 'Ibidi', esclusiva: true },
  { distributore: 'Twin Helix srl', brand: 'IBA Lifesciences', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'Genscript', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'TargetMol', esclusiva: false },
  { distributore: 'Twin Helix srl', brand: 'Repligen', esclusiva: false },
  { distributore: 'VWR International', brand: 'Avantor', esclusiva: true },
  { distributore: 'VWR International', brand: 'JT Baker', esclusiva: true },
  { distributore: 'VWR International', brand: 'QuantaBio', esclusiva: true },
  { distributore: 'VWR International', brand: 'VWR Collection', esclusiva: true },
  { distributore: 'VWR International', brand: 'Agilent', esclusiva: false },
  { distributore: 'VWR International', brand: 'Beckman Coulter', esclusiva: false },
  { distributore: 'VWR International', brand: 'Corning', esclusiva: false },
  { distributore: 'VWR International', brand: 'Eppendorf', esclusiva: false },
  { distributore: 'VWR International', brand: 'Merck', esclusiva: false },
  { distributore: 'VWR International', brand: 'Sartorius', esclusiva: false },
  { distributore: 'VWR International', brand: 'Thermo Fisher Scientific', esclusiva: false },
  { distributore: 'VWR International', brand: 'Oxford Nanopore', esclusiva: false },
  { distributore: 'PROMEGA', brand: 'Promega', esclusiva: true },
  { distributore: 'SARSTEDT', brand: 'Sarstedt', esclusiva: true },
  { distributore: 'MILTENYI', brand: 'Miltenyi', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'Trilink Biotechnologies', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'EpiCypher', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'Signagen Laboratories', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'Synbio Technologies', esclusiva: true },
  { distributore: 'TEBUBIO', brand: 'Peprotech', esclusiva: false },
  { distributore: 'TEBUBIO', brand: 'BPS Bioscience', esclusiva: false },
  { distributore: 'TEBUBIO', brand: 'Raybiotech', esclusiva: false },
  { distributore: 'TEBUBIO', brand: 'Genecopoeia', esclusiva: false },
  { distributore: '2BIOLOGICAL', brand: 'FINE SCIENCE TOOLS', esclusiva: true },
  { distributore: 'BECTON DICKINSON', brand: 'BD', esclusiva: true },
  { distributore: 'EPPENDORF', brand: 'EPPENDORF', esclusiva: true },
  { distributore: 'EUROFINS GENOMICS', brand: 'EUROFINS GENOMICS', esclusiva: true },
  { distributore: 'ILLUMINA', brand: 'ILLUMINA', esclusiva: true },
  { distributore: 'LGC STANDARDS', brand: 'ATCC', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'Life Technologies', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'PEPROTECH', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'GIBCO', esclusiva: true },
  { distributore: 'LIFE TECHNOLOGIES (THERMOFISHER)', brand: 'APPLIED BIOSYSTEM', esclusiva: true },
  { distributore: 'QIAGEN', brand: 'QIAGEN', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Abcam', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Sino Biological', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Lexogen', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Capricorn Scientific', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Genetex', esclusiva: true },
  { distributore: 'PRODOTTI GIANNI', brand: 'Jackson ImmunoResearch', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Raybiotech', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'TargetMol', esclusiva: false },
  { distributore: 'PRODOTTI GIANNI', brand: 'Origene', esclusiva: false },
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

// Smart Category Matcher
app.post('/api/categories/match', (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Descrizione richiesta' });
  const suggerimenti = smartCategoryMatch(description);
  if (suggerimenti.length === 0) {
    return res.json({ suggerimenti: [{ famiglia: 'N/A', sottofamiglia: 'Nessuna corrispondenza trovata', confidenza: 0, spiegazione: 'Prova con termini piu specifici del prodotto' }] });
  }
  res.json({ suggerimenti });
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
