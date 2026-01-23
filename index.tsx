import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Importação explícita com extensão para o Vite

// O Vite na Vercel precisa encontrar o ID 'root' definido no seu index.html
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);