import { Entity } from 'koota';
import { Transform } from '../../traits';
import { Grid } from '@react-three/drei';
import { useRef, useCallback, MutableRefObject } from 'react';
import { Group, Vector3, Euler } from 'three';

interface TrackViewProps {
  entity: Entity;
}

/**
 * Renders the basic track ground grid
 */
export function TrackView({ entity }: TrackViewProps) {
  const groupRef = useRef<Group | null>(null) as MutableRefObject<Group | null>;

  // Set up initial state with useCallback
  const setInitial = useCallback(
    (group: Group | null) => {
      if (!group) return;
      groupRef.current = group;

      // Ensure the track has a transform
      if (!entity.has(Transform)) {
        entity.set(Transform, {
          position: new Vector3(0, -0.5, 0),
          rotation: new Euler(0, 0, 0),
          scale: new Vector3(1, 1, 1),
        });
      }
    },
    [entity]
  );

  // Only render the ground grid, individual segments are rendered separately
  return (
    <group ref={setInitial}>
      {/* The main ground grid for orientation */}
      <Grid
        args={[1000, 1000]}
        cellSize={5}
        cellThickness={0.3}
        cellColor="#333333"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={1000}
        position={[0, -0.5, 0]}
      />
    </group>
  );
} 