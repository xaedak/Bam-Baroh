import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SaveProvider } from './state/SaveContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SaveProvider>
      <App />
    </SaveProvider>
  </React.StrictMode>
);
