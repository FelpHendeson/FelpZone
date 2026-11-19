import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { aplicarCores } from './estilos/cores';
import { App } from './ui/App';
import './estilos/tokens.css';
import './style.css';

aplicarCores();

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
