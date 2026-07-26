import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SaveProvider } from './state/SaveContext';
import { AuthProvider } from './state/AuthContext';
import './index.css';

// AuthProvider wraps SaveProvider (rather than the other way around, or
// nested inside App as before) so SaveContext can read the signed-in
// Discord session and sync progression to it. See SaveContext.tsx.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SaveProvider>
        <App />
      </SaveProvider>
    </AuthProvider>
  </React.StrictMode>
);
