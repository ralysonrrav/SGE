import React from 'react';
import ReactDOM from 'react-dom/client';
// Usamos o caminho relativo explícito com extensão para evitar erros no navegador
import App from './App.tsx'; 

// Busca o elemento 'root' definido no seu index.html
const rootElement = document.getElementById('root');

if (!rootElement) {
  // Erro crítico caso o HTML não esteja carregando o div corretamente
  throw new Error("Erro Crítico: O elemento com id 'root' não foi encontrado no index.html.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);