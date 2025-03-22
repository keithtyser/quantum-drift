/**
 * Perlin noise implementation for procedural generation
 * Adapted from improved noise algorithm by Ken Perlin
 */

// Permutation table
const permutation: number[] = Array.from({ length: 512 }, (_, i) => {
  return i < 256 ? Math.floor(Math.random() * 256) : i - 256;
});

/**
 * Linear interpolation
 */
function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

/**
 * Smooth interpolation
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Gradient function for Perlin noise
 */
function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * Generate 3D Perlin noise
 * @param x - X coordinate
 * @param y - Y coordinate (optional, defaults to 0)
 * @param z - Z coordinate or seed (optional, defaults to 0)
 * @returns Noise value between -1 and 1
 */
export function noise(x: number, y: number = 0, z: number = 0): number {
  // Scale inputs to make result more random-looking
  x = x || 0;
  y = y || 0;
  z = z || 0;
  
  // Find unit cube that contains point
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  
  // Find relative x, y, z of point in cube
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  
  // Compute fade curves for each of x, y, z
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  
  // Hash coordinates of the 8 cube corners
  const A = permutation[X] + Y;
  const AA = permutation[A] + Z;
  const AB = permutation[A + 1] + Z;
  const B = permutation[X + 1] + Y;
  const BA = permutation[B] + Z;
  const BB = permutation[B + 1] + Z;
  
  // Add blended results from 8 corners of cube
  return lerp(
    w,
    lerp(
      v,
      lerp(
        u,
        grad(permutation[AA], x, y, z),
        grad(permutation[BA], x - 1, y, z)
      ),
      lerp(
        u,
        grad(permutation[AB], x, y - 1, z),
        grad(permutation[BB], x - 1, y - 1, z)
      )
    ),
    lerp(
      v,
      lerp(
        u,
        grad(permutation[AA + 1], x, y, z - 1),
        grad(permutation[BA + 1], x - 1, y, z - 1)
      ),
      lerp(
        u,
        grad(permutation[AB + 1], x, y - 1, z - 1),
        grad(permutation[BB + 1], x - 1, y - 1, z - 1)
      )
    )
  );
}

/**
 * Generate 2D Perlin noise
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param seed - Optional seed value
 * @returns Noise value between -1 and 1
 */
export function noise2d(x: number, y: number, seed: number = 0): number {
  return noise(x, y, seed);
}

/**
 * Generate 1D Perlin noise
 * @param x - X coordinate
 * @param seed - Optional seed value
 * @returns Noise value between -1 and 1
 */
export function noise1d(x: number, seed: number = 0): number {
  return noise(x, 0, seed);
}

/**
 * Generate octaved Perlin noise with multiple frequencies
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of octaves
 * @param persistence - How much each octave contributes
 * @param seed - Optional seed value
 * @returns Noise value between -1 and 1
 */
export function octaveNoise(
  x: number,
  y: number = 0,
  octaves: number = 4,
  persistence: number = 0.5,
  seed: number = 0
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency, seed) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  // Return normalized value
  return total / maxValue;
} 