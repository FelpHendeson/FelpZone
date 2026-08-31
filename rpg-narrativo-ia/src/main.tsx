import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import './ui/styles/global.css';

registerSW({ immediate: true });

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemento raiz não encontrado.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
