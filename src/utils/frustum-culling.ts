import { Entity } from 'koota';
import { TrackSegment, Transform } from '../traits';
import * as THREE from 'three';
import { calculateBoundingBox } from './track-geometry';

// Reuse frustum and camera objects to avoid garbage collection
const _frustum = new THREE.Frustum();
const _camera = new THREE.PerspectiveCamera();
const _viewProjectionMatrix = new THREE.Matrix4();

/**
 * Filters out track segments that are outside the view frustum to optimize rendering
 * @param segments Array of track segment entities to filter
 * @param renderDistance Maximum distance to render segments (optional)
 * @returns Array of visible track segment entities
 */
export function frustumCulling(segments: Entity[], renderDistance: number = Infinity): Entity[] {
  if (!segments || segments.length === 0) return [];
  
  try {
    // Get the current camera from Three.js
    if (!window.currentCamera) {
      // If camera not available, skip culling
      console.warn('Camera not available for frustum culling, showing all segments');
      return segments;
    }
    
    // Update the frustum with current camera matrix
    const camera = window.currentCamera;
    _camera.copy(camera);
    _camera.updateMatrixWorld();
    _viewProjectionMatrix.multiplyMatrices(_camera.projectionMatrix, _camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_viewProjectionMatrix);
    
    // Camera position for distance culling
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    // Filter segments that are in the frustum
    return segments.filter(entity => {
      const segment = entity.get(TrackSegment);
      if (!segment || !segment.controlPoints || segment.controlPoints.length === 0) {
        return false;
      }
      
      // Do a quick check with the segment's position first
      const transform = entity.get(Transform);
      if (transform) {
        const distance = cameraPosition.distanceTo(transform.position);
        // Early reject if too far away
        if (distance > renderDistance) {
          return false;
        }
        
        // Quick check using segment position
        if (_frustum.containsPoint(transform.position)) {
          return true;
        }
      }
      
      // If quick check fails, do a more detailed check with the bounding box
      const boundingBox = calculateBoundingBox(segment.controlPoints);
      
      // Create a box3 for more accurate culling
      const box = new THREE.Box3(boundingBox.min, boundingBox.max);
      
      // Check if the box is in the frustum
      return _frustum.intersectsBox(box);
    });
  } catch (error) {
    console.error('Error during frustum culling:', error);
    return segments; // Return all segments if error occurs
  }
}

// Declare global interface for camera access
declare global {
  interface Window {
    currentCamera?: THREE.Camera;
  }
} 