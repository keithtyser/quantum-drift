import * as React from 'react';
import { useState } from 'react';
import { create } from 'zustand';
import { Stats } from '@react-three/drei';

interface DebugState {
  showFPS: boolean;
  showWireframe: boolean;
  showBoundingBoxes: boolean;
  showQuantumEffects: boolean;
  setShowFPS: (value: boolean) => void;
  setShowWireframe: (value: boolean) => void;
  setShowBoundingBoxes: (value: boolean) => void;
  setShowQuantumEffects: (value: boolean) => void;
}

// Create a debug state store for global access
export const useDebugStore = create<DebugState>(set => ({
  showFPS: false,
  showWireframe: false,
  showBoundingBoxes: false,
  showQuantumEffects: true, // Enable quantum effects by default
  setShowFPS: (value) => set({ showFPS: value }),
  setShowWireframe: (value) => set({ showWireframe: value }),
  setShowBoundingBoxes: (value) => set({ showBoundingBoxes: value }),
  setShowQuantumEffects: (value) => set({ showQuantumEffects: value }),
}));

// Debug state for components to reference
export const debugState = {
  get showFPS() { return useDebugStore.getState().showFPS; },
  get showWireframe() { return useDebugStore.getState().showWireframe; },
  get showBoundingBoxes() { return useDebugStore.getState().showBoundingBoxes; },
  get showQuantumEffects() { return useDebugStore.getState().showQuantumEffects; },
};

/**
 * Debug UI component that provides controls for debugging the game
 */
export function DebugControls() {
  const [isVisible, setIsVisible] = useState(false);
  const { 
    showFPS, setShowFPS, 
    showWireframe, setShowWireframe, 
    showBoundingBoxes, setShowBoundingBoxes,
    showQuantumEffects, setShowQuantumEffects
  } = useDebugStore();

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 16px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Show Debug
      </button>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        borderRadius: '8px',
        zIndex: 1000,
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        Debug Controls
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            marginLeft: '10px',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={showFPS} 
            onChange={e => setShowFPS(e.target.checked)} 
          />
          Show FPS
        </label>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={showWireframe} 
            onChange={e => setShowWireframe(e.target.checked)} 
          />
          Wireframe Mode
        </label>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={showBoundingBoxes} 
            onChange={e => setShowBoundingBoxes(e.target.checked)} 
          />
          Show Bounding Boxes
        </label>
      </div>
      
      <div style={{ marginBottom: '6px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={showQuantumEffects} 
            onChange={e => setShowQuantumEffects(e.target.checked)} 
          />
          Quantum Effects
        </label>
      </div>
    </div>
  );
} 