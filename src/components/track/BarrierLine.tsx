import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { Vector3 } from 'three';

interface BarrierLineProps {
  points: Vector3[];
  side: 'left' | 'right';
}

/**
 * Component to render a barrier along track edge with posts
 */
export function BarrierLine({ points, side }: BarrierLineProps) {
  if (points.length < 2) return null;
  
  // Generate barrier posts
  const barrierPosts = useMemo(() => {
    const posts = [];
    // Place posts every few points along the edge
    for (let i = 0; i < points.length; i += 2) {
      const point = points[i].clone();
      // Adjust height for the post
      point.y += 0.5; // Half height of the post
      posts.push(point);
    }
    return posts;
  }, [points]);
  
  const barrierColor = side === 'left' ? '#ff4444' : '#4444ff';
  
  return (
    <group>
      {/* Barrier line */}
      <Line
        points={points}
        color={barrierColor}
        lineWidth={4}
      />
      
      {/* Barrier posts */}
      {barrierPosts.map((position, index) => (
        <mesh key={`${side}-post-${index}`} position={position}>
          <boxGeometry args={[0.3, 1, 0.3]} />
          <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
} 