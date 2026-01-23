
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; 

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Erro Crítico: O elemento com id 'root' não foi encontrado no index.html.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
