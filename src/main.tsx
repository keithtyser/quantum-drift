// src/main.tsx
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import './styles.css';
import { App } from './app';
import { WorldProvider } from 'koota/react';
import { world, initializeWorld } from './world';
import { preloadCriticalAssets } from './utils/preload-assets';

// Create the root element first
const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

// Show a loading message while assets are preloading
const loadingElement = document.createElement('div');
loadingElement.style.position = 'absolute';
loadingElement.style.top = '50%';
loadingElement.style.left = '50%';
loadingElement.style.transform = 'translate(-50%, -50%)';
loadingElement.style.background = 'rgba(0,0,0,0.8)';
loadingElement.style.color = '#00ffff';
loadingElement.style.padding = '20px';
loadingElement.style.borderRadius = '10px';
loadingElement.style.fontFamily = 'monospace';
loadingElement.style.zIndex = '1000';
loadingElement.innerHTML = 'Loading Quantum Drift...';
document.body.appendChild(loadingElement);

// Async initialization function
async function initializeApp() {
  try {
    // Step 1: Preload critical assets first
    console.log("Step 1: Preloading critical assets...");
    await preloadCriticalAssets();
    
    // Step 2: Initialize the world
    console.log("Step 2: Initializing world...");
    initializeWorld([0, 5, 10]);
    
    // Step 3: Render the application
    console.log("Step 3: Rendering application...");
    root.render(
      <React.StrictMode>
        <WorldProvider world={world}>
          <App />
        </WorldProvider>
      </React.StrictMode>
    );
    
    // Remove loading message
    document.body.removeChild(loadingElement);
    
    console.log("Application initialization complete!");
  } catch (error) {
    console.error("Error during application initialization:", error);
    
    // Show error message
    loadingElement.style.background = 'rgba(255,0,0,0.8)';
    loadingElement.innerHTML = `Error loading game: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Start initialization
initializeApp();
