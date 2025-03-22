import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

interface BarrierLineProps {
  points: THREE.Vector3[];
  side: 'left' | 'right';
}

/**
 * Component for rendering barriers along the edges of track segments
 */
export function BarrierLine({ points, side }: BarrierLineProps) {
  if (points.length < 2) return null;
  
  // Generate barrier posts with improved spacing
  const barrierPosts = useMemo(() => {
    const posts = [];
    const totalLength = calculatePathLength(points);
    
    // Determine post spacing based on path length
    // Use smaller spacing for tighter curves
    const postSpacing = totalLength < 50 ? 4 : 6;
    const numPosts = Math.max(4, Math.floor(totalLength / postSpacing));
    
    // Place posts evenly along the path
    for (let i = 0; i < numPosts; i++) {
      const t = i / (numPosts - 1);
      const point = getPointAlongPath(points, t);
      
      // Adjust height for the post
      point.y += 0.6; // Half height of the post
      posts.push(point);
    }
    return posts;
  }, [points]);
  
  // Colors for the left and right barriers
  const barrierColor = side === 'left' ? '#ff4444' : '#4444ff';
  
  return (
    <group>
      {/* Barrier line */}
      <Line
        points={points}
        color={barrierColor}
        lineWidth={3}
      />
      
      {/* Barrier posts */}
      {barrierPosts.map((position, index) => (
        <mesh key={`${side}-post-${index}`} position={position}>
          <boxGeometry args={[0.3, 1.2, 0.3]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      
      {/* Barrier top rail - for visual enhancement */}
      <Line
        points={barrierPosts.map(post => new THREE.Vector3(post.x, post.y + 0.6, post.z))}
        color={barrierColor}
        lineWidth={2}
      />
    </group>
  );
}

/**
 * Calculate the total length of a path defined by points
 */
function calculatePathLength(points: THREE.Vector3[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i - 1]);
  }
  return length;
}

/**
 * Get a point along a path at a specific parametric position t (0-1)
 */
function getPointAlongPath(points: THREE.Vector3[], t: number): THREE.Vector3 {
  if (points.length === 0) return new THREE.Vector3();
  if (points.length === 1) return points[0].clone();
  
  if (t <= 0) return points[0].clone();
  if (t >= 1) return points[points.length - 1].clone();
  
  // Calculate the target distance along the path
  const totalLength = calculatePathLength(points);
  const targetDistance = totalLength * t;
  
  // Walk the path segments to find the point
  let currentDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const segmentLength = points[i].distanceTo(points[i - 1]);
    if (currentDistance + segmentLength >= targetDistance) {
      // Found the segment containing our point
      const segmentT = (targetDistance - currentDistance) / segmentLength;
      return new THREE.Vector3().lerpVectors(points[i - 1], points[i], segmentT);
    }
    currentDistance += segmentLength;
  }
  
  // Fallback - should not reach here
  return points[points.length - 1].clone();
} 