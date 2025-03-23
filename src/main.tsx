// src/main.tsx
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import './styles.css';
import { App } from './app';
import { WorldProvider } from 'koota/react';
import { world } from './world';

// Create root & render
ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to test entity persistence
  // <React.StrictMode>
    <WorldProvider world={world}>
      <App />
    </WorldProvider>
  // </React.StrictMode>
);
