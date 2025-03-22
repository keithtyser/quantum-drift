import { useMemo } from 'react';
import * as THREE from 'three';
import { SegmentType } from '../../utils/track-generator';

interface TrackSegmentData {
  type: SegmentType;
  index: number;
  width: number;
}

interface TrackSurfacePatternProps {
  segment: TrackSegmentData;
  geometry: THREE.BufferGeometry;
}

/**
 * Renders different surface patterns based on track segment type
 */
export function TrackSurfacePattern({ segment, geometry }: TrackSurfacePatternProps) {
  // Create a canvas-based texture for the track pattern
  const getPatternTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Clear canvas
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pattern based on segment type
    switch (segment.type) {
      case 'curve-left':
      case 'curve-right':
        // Draw curve pattern - diagonal lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 8;
        for (let i = -canvas.width; i < canvas.width * 2; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + canvas.height, canvas.height);
          ctx.stroke();
        }
        break;
      case 'chicane':
      case 's-curve':
        // Draw chicane pattern - zig-zag lines
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 8;
        ctx.beginPath();
        for (let y = 20; y < canvas.height; y += 60) {
          for (let x = 0; x < canvas.width; x += 80) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 40, y + 30);
            ctx.lineTo(x + 80, y);
          }
        }
        ctx.stroke();
        break;
      case 'hill-up':
        // Draw uphill pattern - upward-pointing chevrons
        ctx.strokeStyle = '#446644';
        ctx.lineWidth = 10;
        for (let y = canvas.height; y > 0; y -= 60) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 120) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 60, y - 30);
            ctx.lineTo(x + 120, y);
          }
          ctx.stroke();
        }
        break;
      case 'hill-down':
        // Draw downhill pattern - downward-pointing chevrons
        ctx.strokeStyle = '#664444';
        ctx.lineWidth = 10;
        for (let y = 0; y < canvas.height; y += 60) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 120) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 60, y + 30);
            ctx.lineTo(x + 120, y);
          }
          ctx.stroke();
        }
        break;
      default:
        // Draw straight pattern - dashed center line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        
        // Draw edge markings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(20, canvas.height);
        ctx.moveTo(canvas.width - 20, 0);
        ctx.lineTo(canvas.width - 20, canvas.height);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  };
  
  // Create texture if segment exists
  const texture = useMemo(() => {
    return getPatternTexture();
  }, [segment.type]);
  
  // Get base color for the track type
  const getTrackColor = () => {
    switch (segment.type) {
      case 'curve-left':
      case 'curve-right':
        return '#444466'; // Slight blue tint for curves
      case 'chicane':
      case 's-curve':
        return '#445566'; // More pronounced blue for chicanes
      case 'hill-up':
        return '#446644'; // Green tint for uphill
      case 'hill-down':
        return '#664444'; // Red tint for downhill
      default:
        return '#444444'; // Default grey for straight
    }
  };
  
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={getTrackColor()} 
        roughness={0.9} 
        metalness={0.1}
        side={THREE.DoubleSide}
        map={texture}
      />
    </mesh>
  );
} 