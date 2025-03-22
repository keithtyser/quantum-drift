import { useQueryFirst } from 'koota/react';
import { Entity } from 'koota';
import { IsTrack, Transform } from '../traits';
import { Grid } from '@react-three/drei';
import { useRef, MutableRefObject, useCallback } from 'react';
import * as THREE from 'three';
import { Group } from 'three';

export function TrackView({ entity }: { entity: Entity }) {
  const groupRef = useRef<Group | null>(null) as MutableRefObject<Group | null>;

  // Set up initial state with useCallback
  const setInitial = useCallback(
    (group: Group | null) => {
      if (!group) return;
      groupRef.current = group;

      // Ensure the track has a transform
      if (!entity.has(Transform)) {
        entity.set(Transform, {
          position: new THREE.Vector3(0, -0.5, 0),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
        });
      }
    },
    [entity]
  );

  return (
    <group ref={setInitial}>
      {/* Flat plane for the track with grid texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <Grid args={[100, 100]} cellSize={1} cellThickness={0.5} cellColor="#6f6f6f" sectionSize={5} sectionThickness={1} sectionColor="#9d4b4b" fadeDistance={100} />
    </group>
  );
}

// Query for the track entity and render it
export function TrackRenderer() {
  const track = useQueryFirst(IsTrack, Transform);
  return track ? <TrackView entity={track} /> : null;
} 