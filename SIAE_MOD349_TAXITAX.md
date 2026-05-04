# DICHIARAZIONE PER LA REGISTRAZIONE DI PROGRAMMA PER ELABORATORE
## Modello 349 — SIAE

---

**SIAE - Direzione Generale - Membership**
Viale della Letteratura 30 – 00144 Roma

---

## 1. RICHIEDENTE LA REGISTRAZIONE

**Cognome e Nome:** GIUSSANI GIORGIO
**Codice Fiscale:** GSSGRG86D02G388M
**Indirizzo:** Via Enrico Berlinguer, 13 – 27012 Certosa di Pavia (PV) – Italia
**Telefono:** ___________________________
**E-mail:** ___________________________

---

## 2. AUTORE/I DEL SOFTWARE

**Cognome e Nome:** GIUSSANI GIORGIO
**Codice Fiscale:** GSSGRG86D02G388M
**Indirizzo:** Via Enrico Berlinguer, 13 – 27012 Certosa di Pavia (PV) – Italia

> Il richiedente coincide con l'autore del software.

---

## 3. TITOLO DEL PROGRAMMA

**TAXITAX!**

---

## 4. DATA E LUOGO DI PRIMA PUBBLICAZIONE

**Data:** Marzo 2025
**Luogo:** Italia
**Modalità:** Prima installazione e messa in uso presso cliente finale sul territorio italiano.

---

## 5. LINGUAGGIO DI PROGRAMMAZIONE

- **Frontend:** JavaScript (React 18, Vite)
- **Backend:** JavaScript (Node.js 20, Express.js)
- **Database:** MongoDB 7
- **Tecnologie accessorie:** JWT, Multer, XLSX, PDF-Parse, Mongoose, Tailwind CSS

---

## 6. DESCRIZIONE IDENTIFICATIVA DEL SOFTWARE

**TAXITAX!** è un'applicazione web SaaS (Software as a Service) multi-tenant destinata
alla gestione amministrativa e contabile di professionisti del settore taxi e NCC
(Noleggio Con Conducente).

Il sistema è strutturato su tre livelli di utenza:

- **Super Amministratore:** gestione della piattaforma e dei consulenti registrati;
- **Consulente:** commercialista o intermediario fiscale che gestisce uno o più clienti,
  con accesso alle funzionalità di importazione dati, approvazione costi, gestione
  documentale e reportistica;
- **Cliente:** autista taxi o NCC che accede alla propria area personale per registrare
  corrispettivi giornalieri, costi e spese, versamenti, fatture e documenti.

**Funzionalità principali:**

1. Registrazione e gestione corrispettivi giornalieri con importazione da file Excel,
   CSV e PDF;
2. Gestione costi e spese con categorizzazione (carburante, manutenzione,
   assicurazione, bollo, pedaggi, parcheggi) e allegato giustificativo (PDF/immagine);
3. Gestione versamenti e fatture attive;
4. Import massivo registro IVA acquisti da file Excel/CSV;
5. Import batch multi-cliente per corrispettivi;
6. Gestione documentale con upload e download sicuro di documenti (patente, carta
   d'identità, codice fiscale, licenza taxi, visura camerale, ecc.);
7. Anagrafica cliente con codice cliente, numero licenza taxi, comune di rilascio,
   codice fiscale, partita IVA;
8. Gestione veicolo attivo con storico (vendita, permuta, rottamazione);
9. Topbar informativa con dati del cliente in tempo reale (nome, codice cliente,
   licenza, targa veicolo);
10. Sistema di notifiche in-app per il consulente (cambio veicolo, cambio stato cliente);
11. Gestione stato cliente (attivo, sospeso, cessato) con log storico delle variazioni;
12. Export registro corrispettivi in formato Excel e PDF;
13. Dashboard con statistiche annuali, grafici e indicatori fiscali (IRPEF, IVA);
14. Inserimento corrispettivi tramite riconoscimento vocale;
15. Architettura multi-tenant con isolamento dati per cliente.

**Architettura tecnica:**
L'applicazione è strutturata come monorepo con frontend React servito come SPA
(Single Page Application) e backend REST API Express.js. L'autenticazione avviene
tramite token JWT. I dati sono persistiti su database MongoDB con indici ottimizzati
per query multi-tenant. Il sistema è deployato su infrastruttura cloud con supporto
a Progressive Web App (PWA) per l'installazione su dispositivi mobili.

---

## 7. DICHIARAZIONE

Il sottoscritto **GIUSSANI GIORGIO**, nato il ____________ a ____________,
in qualità di autore e richiedente la registrazione, dichiara che il programma
per elaboratore denominato **TAXITAX!** è opera originale di propria creazione,
che non viola diritti di terzi e che tutti i dati indicati nella presente
dichiarazione sono veritieri.

Dichiara altresì di essere a conoscenza delle sanzioni previste dall'art. 76 del
D.P.R. 28 dicembre 2000, n. 445, in caso di dichiarazioni mendaci.

---

**Luogo:** Certosa di Pavia (PV)

**Data:** ___________________________

**Firma:** ___________________________

---

## NOTE PER LA SPEDIZIONE

Allegare alla presente dichiarazione:

- [ ] CD/DVD non riscrivibile contenente il codice sorgente di TAXITAX!
      (il supporto deve recare il titolo "TAXITAX!" firmato con pennarello indelebile)
- [ ] Copia documento d'identità in corso di validità (fronte/retro)
- [ ] Ricevuta del versamento della quota SIAE per la registrazione software
- [ ] La presente dichiarazione firmata in originale

**Spedire tramite raccomandata A/R o corriere a:**
SIAE - Direzione Generale - Membership
Viale della Letteratura, 30
00144 Roma
