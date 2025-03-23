import { trait } from 'koota';
import * as THREE from 'three';

/**
 * Represents a track segment with properties for procedural generation
 */
export const TrackSegment = trait({
  index: 0, // position in the sequence of segments
  length: 50, // length of this segment in units
  width: 20, // width of the track
  type: 'straight', // 'straight', 'curve-left', 'curve-right', 'hill-up', 'hill-down'
  curvature: 0, // how much the track curves (negative for left, positive for right)
  elevation: 0, // elevation change from start to end
  startPosition: () => new THREE.Vector3(), // world position where the segment starts
  endPosition: () => new THREE.Vector3(), // world position where the segment ends
  startDirection: () => new THREE.Vector3(0, 0, -1), // direction vector at start (normalized)
  endDirection: () => new THREE.Vector3(0, 0, -1), // direction vector at end (normalized)
  controlPoints: () => [] as THREE.Vector3[], // control points for curved segments
}); 