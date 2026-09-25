import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { primeAudio } from './feedback.js';
import './styles.css';

// iOS keeps WebAudio suspended until a user gesture. Prime it on the first touch
// anywhere (normally a Home button), so card sounds are ready by the first play.
window.addEventListener('pointerdown', primeAudio, { once: true, capture: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
