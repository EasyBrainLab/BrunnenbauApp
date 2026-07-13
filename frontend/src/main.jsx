import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Roboto lokal buendeln — ersetzt die frueher per CDN eingebundenen Google Fonts.
// Die CDN-Variante uebertrug bei jedem Seitenaufruf die IP-Adresse des Besuchers ohne
// Einwilligung an Google (vgl. LG Muenchen I, Urteil vom 20.01.2022 – 3 O 17493/20).
// Bitte nicht auf eine CDN-Einbindung zurueckstellen.
//
// Der Hinweis steht hier und nicht in index.html: Kommentare in index.html werden
// woertlich ausgeliefert, und automatisierte Scanner durchsuchen HTML nach der
// CDN-Domain. Selbst ein blosser Treffer im Kommentar kann eine unbegruendete
// Abmahnung ausloesen, die dann abgewehrt werden muss.
//
// Die Gewichte entsprechen der fontFamily-Konfiguration in tailwind.config.js.
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
