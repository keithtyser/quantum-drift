import { Vector3 } from 'three';

interface DebugBoundingBoxProps {
  min: Vector3;
  max: Vector3;
}

/**
 * Debug visualization component for track segment bounding boxes
 */
export function DebugBoundingBox({ min, max }: DebugBoundingBoxProps) {
  const size = new Vector3().subVectors(max, min);
  const center = new Vector3().addVectors(min, max).multiplyScalar(0.5);
  
  return (
    <mesh position={center}>
      <boxGeometry args={[size.x, size.y, size.z]} />
      <meshBasicMaterial color="red" wireframe={true} opacity={0.3} transparent={true} />
    </mesh>
  );
} 