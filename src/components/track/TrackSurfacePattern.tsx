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
 * Component to render track surfaces with distinctive patterns based on segment type
 */
export function TrackSurfacePattern({ segment, geometry }: TrackSurfacePatternProps) {
  // Create texture based on segment type
  const texture = useMemo(() => {
    return createPatternTexture(segment.type);
  }, [segment.type]);
  
  // Get base color for the track type
  const trackColor = useMemo(() => {
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
  }, [segment.type]);
  
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={trackColor} 
        roughness={0.9} 
        metalness={0.1}
        side={THREE.DoubleSide}
        map={texture}
      />
    </mesh>
  );
}

/**
 * Create a pattern texture based on segment type
 */
function createPatternTexture(type: SegmentType): THREE.Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Clear canvas with base color
  ctx.fillStyle = '#444444';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw pattern based on segment type
  switch (type) {
    case 'curve-left':
    case 'curve-right':
      // Draw curve pattern - enhanced diagonal lines
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 8;
      
      // Direction of diagonal lines depends on curve direction
      const isRightCurve = type === 'curve-right';
      for (let i = -canvas.width; i < canvas.width * 2; i += 40) {
        ctx.beginPath();
        if (isRightCurve) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i + canvas.height, canvas.height);
        } else {
          ctx.moveTo(canvas.width - i, 0);
          ctx.lineTo(canvas.width - i - canvas.height, canvas.height);
        }
        ctx.stroke();
      }
      
      // Add center line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      
      // Add arrow indicators for curve direction
      ctx.fillStyle = isRightCurve ? '#8888FF' : '#FF8888';
      ctx.setLineDash([]);
      for (let y = 40; y < canvas.height; y += 100) {
        drawArrow(ctx, canvas.width / 2, y, isRightCurve ? canvas.width / 2 + 30 : canvas.width / 2 - 30, y, 10);
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
      
      // Add S-curve indicators
      ctx.strokeStyle = '#AAAAFF';
      ctx.lineWidth = 4;
      for (let y = 50; y < canvas.height; y += 100) {
        ctx.beginPath();
        const centerX = canvas.width / 2;
        const offsetX = 40;
        
        // Draw S shape
        ctx.moveTo(centerX - offsetX, y - 20);
        ctx.bezierCurveTo(
          centerX - offsetX + 30, y - 20,
          centerX - 30, y + 20,
          centerX, y + 20
        );
        ctx.bezierCurveTo(
          centerX + 30, y + 20,
          centerX + offsetX - 30, y - 20,
          centerX + offsetX, y - 20
        );
        ctx.stroke();
      }
      break;
      
    case 'hill-up':
      // Draw uphill pattern - upward-pointing chevrons
      ctx.strokeStyle = '#66AA66';
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
      
      // Add center line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      
      // Add up arrows
      ctx.fillStyle = '#AAFFAA';
      ctx.setLineDash([]);
      for (let y = canvas.height - 60; y > 0; y -= 120) {
        drawArrow(ctx, canvas.width / 2, y, canvas.width / 2, y - 40, 10);
      }
      break;
      
    case 'hill-down':
      // Draw downhill pattern - downward-pointing chevrons
      ctx.strokeStyle = '#AA6666';
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
      
      // Add center line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      
      // Add down arrows
      ctx.fillStyle = '#FFAAAA';
      ctx.setLineDash([]);
      for (let y = 60; y < canvas.height; y += 120) {
        drawArrow(ctx, canvas.width / 2, y, canvas.width / 2, y + 40, 10);
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
      
      // Add straight indicators
      ctx.fillStyle = '#FFFFFF';
      ctx.setLineDash([]);
      for (let y = 60; y < canvas.height; y += 120) {
        drawArrow(ctx, canvas.width / 2, y - 40, canvas.width / 2, y + 40, 10);
      }
  }
  
  return new THREE.CanvasTexture(canvas);
}

/**
 * Helper function to draw an arrow on a canvas
 */
function drawArrow(
  ctx: CanvasRenderingContext2D, 
  fromX: number, 
  fromY: number, 
  toX: number, 
  toY: number, 
  headSize: number
): void {
  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  
  // Calculate arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  // Draw arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headSize * Math.cos(angle - Math.PI / 6),
    toY - headSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headSize * Math.cos(angle + Math.PI / 6),
    toY - headSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
} 