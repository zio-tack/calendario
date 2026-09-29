import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DEFAULT_CONFIG } from './config';
import './styles.css';

async function start() {
  // Legge config.json a runtime (cache disattivata) e lo fonde coi default
  let cfg = {};
  try {
    const r = await fetch(import.meta.env.BASE_URL + 'config.json', { cache: 'no-store' });
    cfg = await r.json();
  } catch { /* offline o file assente: si usano i default */ }

  // Chiede al browser di non cancellare il DB locale quando lo spazio scarseggia
  navigator.storage?.persist?.();

  createRoot(document.getElementById('root')).render(<App config={{ ...DEFAULT_CONFIG, ...cfg }} />);
}
start();
