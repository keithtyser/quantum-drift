import React, { useState } from 'react';
import { useWorld } from 'koota/react';
import { Stats } from '@react-three/drei';

// Global debug state that can be accessed throughout the application
export const debugState = {
  showBoundaries: false,
  showTrackSegmentIds: false,
  showControlPoints: false,
};

/**
 * Debug UI component that provides controls for debugging the game
 */
export function DebugControls() {
  const world = useWorld();
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(debugState.showBoundaries);
  const [showTrackSegmentIds, setShowTrackSegmentIds] = useState(debugState.showTrackSegmentIds);
  const [showControlPoints, setShowControlPoints] = useState(debugState.showControlPoints);

  // Update global debug state when UI changes
  const toggleBoundaries = () => {
    debugState.showBoundaries = !debugState.showBoundaries;
    setShowBoundaries(debugState.showBoundaries);
  };

  const toggleSegmentIds = () => {
    debugState.showTrackSegmentIds = !debugState.showTrackSegmentIds;
    setShowTrackSegmentIds(debugState.showTrackSegmentIds);
  };
  
  const toggleControlPoints = () => {
    debugState.showControlPoints = !debugState.showControlPoints;
    setShowControlPoints(debugState.showControlPoints);
  };

  const resetAll = () => {
    console.log('Reset game triggered from debug controls');
    // Would dispatch a reset action here if it was implemented
  };

  return (
    <>
      <Stats />
      
      {/* Debug toggle button */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
      }}>
        <button
          onClick={() => setShowDebugMenu(!showDebugMenu)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showDebugMenu ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>

      {/* Debug menu */}
      {showDebugMenu && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '10px',
          borderRadius: '5px',
          color: 'white',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '180px',
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Debug Controls</h3>
          
          <button
            onClick={toggleBoundaries}
            style={{
              padding: '5px',
              backgroundColor: showBoundaries ? '#4CAF50' : '#555',
              border: 'none',
              borderRadius: '3px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {showBoundaries ? 'Hide Boundaries' : 'Show Boundaries'}
          </button>
          
          <button
            onClick={toggleSegmentIds}
            style={{
              padding: '5px',
              backgroundColor: showTrackSegmentIds ? '#4CAF50' : '#555',
              border: 'none',
              borderRadius: '3px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {showTrackSegmentIds ? 'Hide Segment IDs' : 'Show Segment IDs'}
          </button>
          
          <button
            onClick={toggleControlPoints}
            style={{
              padding: '5px',
              backgroundColor: showControlPoints ? '#4CAF50' : '#555',
              border: 'none',
              borderRadius: '3px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {showControlPoints ? 'Hide Control Points' : 'Show Control Points'}
          </button>
          
          <button
            onClick={resetAll}
            style={{
              padding: '5px',
              backgroundColor: '#f44336',
              border: 'none',
              borderRadius: '3px',
              color: 'white',
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            Reset Game
          </button>
          
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
            <div>Controls:</div>
            <div>W/S: Forward/Brake</div>
            <div>A/D: Turn left/right</div>
            <div>R: Reset (double tap)</div>
          </div>
        </div>
      )}
    </>
  );
} 