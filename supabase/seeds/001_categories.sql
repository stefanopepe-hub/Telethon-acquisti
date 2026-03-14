INSERT INTO categories (numero, famiglia, sottofamiglia) VALUES
-- 1. Plasticware
(1, 'Plasticware', 'Puntali con filtro'),
(1, 'Plasticware', 'Puntali senza filtro'),
(1, 'Plasticware', 'Tubi and Plates'),
(1, 'Plasticware', 'Stripette'),
(1, 'Plasticware', 'Petri dish'),
(1, 'Plasticware', 'Multiwell'),
(1, 'Plasticware', 'Fiasche tappo ventilato'),
(1, 'Plasticware', 'Fiasche tappo non ventilato'),
(1, 'Plasticware', 'Cell Scrapers'),
(1, 'Plasticware', 'Cell strainers'),
(1, 'Plasticware', 'Cell Stack'),
(1, 'Plasticware', 'Filtri a bicchiere (Stericup)'),
(1, 'Plasticware', 'Cryovials'),
(1, 'Plasticware', 'Counting Slides'),
(1, 'Plasticware', 'Vials'),
(1, 'Plasticware', 'Multipette'),
(1, 'Plasticware', 'Cuvette'),
(1, 'Plasticware', 'Slides'),
(1, 'Plasticware', 'Strips'),
(1, 'Plasticware', 'Pipette monocanale'),
(1, 'Plasticware', 'Pipette multicanale'),
(1, 'Plasticware', 'Liquid handling consumables'),
(1, 'Plasticware', 'Altro'),

-- 2. Glassware
(2, 'Glassware', 'Bottle'),
(2, 'Glassware', 'Beute Erlenmeyer'),
(2, 'Glassware', 'Microtube'),
(2, 'Glassware', 'Glass slides (vetrini) - portaoggetto, coprioggetto'),

-- 3. Disposable
(3, 'Disposable', 'PROTEZIONE: camici, calzari, sopracalzari, guanti nitrile, guanti lattice'),
(3, 'Disposable', 'BUSTE BIOHAZARD RIFIUTI SPECIALI'),
(3, 'Disposable', 'CONSERVAZIONE CAMPIONI: contenitori PCR, cryoboxes, Parafilm, box'),
(3, 'Disposable', 'Disposable generale: nastro autoclave, carta da banco, cartine pH, spruzzette, pinze, aghi, lame, siringhe, anse, detergenti, alcool'),
(3, 'Disposable', 'Rotoli carta'),
(3, 'Disposable', 'Sicurezza'),

-- 4. Cancelleria & Stampati
(4, 'Cancelleria & Stampati', 'Cancelleria'),
(4, 'Cancelleria & Stampati', 'Materiale generico vario'),
(4, 'Cancelleria & Stampati', 'Riviste'),
(4, 'Cancelleria & Stampati', 'Pubblicazioni'),

-- 5a. Equipments e Arredi
(5, 'Equipments e Arredi', 'Apparecchiatura Elettronica: microscopi, fotodocumentazione (Gel Doc, Chemidoc), pHmetri, spettrofotometri, power supply, bilance, cell counter, FACS, luminometro/fluorimetro'),
(5, 'Equipments e Arredi', 'Apparecchiatura Meccanica: centrifughe, ultracentrifughe, vortex, robot liquid handling'),
(5, 'Equipments e Arredi', 'Apparecchiatura Termoregolatore: freezer, frigoriferi, thermomixer, contenitore criogenico (azoto liquido), bagnetti termostatati, stufe, PCR, real time, incubatori, produttori ghiaccio, autoclavi, stirrer'),
(5, 'Equipments e Arredi', 'Arredi Ufficio'),
(5, 'Equipments e Arredi', 'Arredi Laboratorio'),
(5, 'Equipments e Arredi', 'Taratura, PQ, IQ, OQ - Maintenance'),

-- 5b. IT
(5, 'IT', 'PC'),
(5, 'IT', 'Software'),
(5, 'IT', 'Manutenzione software'),
(5, 'IT', 'Materiale informatico: laptop, desktop, mouse, stampanti, toner'),
(5, 'IT', 'Manutenzione hardware'),

-- 6. Lab Reagents
(6, 'Lab Reagents', 'KIT: estrazione, purificazione, luciferase assay, kit vitalità, ELISA, enrichment, depletion'),
(6, 'Lab Reagents', 'PCR: taq, dye, agarosio, DNA/RNA marker'),
(6, 'Lab Reagents', 'REAL TIME PCR: sybr green, mastermix, taqman, probes'),
(6, 'Lab Reagents', 'NGS: preparazione librerie, purificazione, frammentazione'),
(6, 'Lab Reagents', 'CLONING: cellule competenti, kit clonaggio'),
(6, 'Lab Reagents', 'ENZIMI: restrizione, modifica'),
(6, 'Lab Reagents', 'OLIGO'),
(6, 'Lab Reagents', 'SIERI: FBS, FCS, dializzati, horse'),
(6, 'Lab Reagents', 'TERRENI: DMEM, RPMI, Alpha MEM, MEM, Iscove''s'),
(6, 'Lab Reagents', 'ADDITIVI: B27 supplement, glutamine, Pen/Strep, penicillina, streptomicina'),
(6, 'Lab Reagents', 'CITOCHINE'),
(6, 'Lab Reagents', 'TRASFEZIONE'),
(6, 'Lab Reagents', 'ANTICORPI - WB (Western Blot)'),
(6, 'Lab Reagents', 'ANTICORPI - IHC (Immunoistochimica)'),
(6, 'Lab Reagents', 'ANTICORPI - IP (Immunoprecipitazione)'),
(6, 'Lab Reagents', 'ANTICORPI - IF (Immunofluorescenza)'),
(6, 'Lab Reagents', 'CHEMICALS - POLVERI'),
(6, 'Lab Reagents', 'CHEMICALS - SOLVENTI'),
(6, 'Lab Reagents', 'Sequenziamento'),
(6, 'Lab Reagents', 'Sintesi: geni, peptidi, plasmidi'),
(6, 'Lab Reagents', 'GAS'),
(6, 'Lab Reagents', 'Reagenti grado GMP per produzioni farmaceutiche'),

-- 7. Animal Housing
(7, 'Animal Housing', 'Acquisto animali'),
(7, 'Animal Housing', 'Materiali di consumo'),
(7, 'Animal Housing', 'Stabulazione'),

-- 8. Servizi
(8, 'Servizi', 'Logistica'),
(8, 'Servizi', 'Consulenze Ricerca'),
(8, 'Servizi', 'Consulenze generiche'),
(8, 'Servizi', 'Pharma'),
(8, 'Servizi', 'Traduzioni'),
(8, 'Servizi', 'GMP'),
(8, 'Servizi', 'Supply Chain'),
(8, 'Servizi', 'Viaggi');
