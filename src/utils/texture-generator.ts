import * as THREE from 'three';

/**
 * Generates a glow texture programmatically and saves it to the public folder
 * This is used when the game is first loaded to ensure we have the required textures
 */
export function generateGlowTexture(): void {
  // Create a canvas for the texture
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Failed to get 2D context for texture generation');
    return;
  }
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Create a radial gradient for the glow
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2;
  
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, radius
  );
  
  // Add color stops for a soft glow
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  
  // Fill with gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Create data URL and save to file
  const dataUrl = canvas.toDataURL('image/png');
  
  // In a browser environment, we'd need to either:
  // 1. Save the file on the server side
  // 2. Use the dataUrl directly in Three.js
  // For now, we'll log and use it directly in our app
  console.log('Glow texture generated');
  
  // Convert to blob and save (in a real app)
  // This part requires server-side code, but we'll prepare the client-side
  try {
    // For development: save texture data to localStorage for debugging
    localStorage.setItem('quantum-drift-glow-texture', dataUrl);
  } catch (e) {
    console.error('Failed to store texture in localStorage', e);
  }
  
  // Create download link (for development/testing)
  const link = document.createElement('a');
  link.download = 'glow.png';
  link.href = dataUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  // Don't automatically trigger download
  // link.click();
  document.body.removeChild(link);
}

/**
 * Create a Three.js texture directly from generated data
 */
export function createGlowTexture(): THREE.Texture {
  // Create a canvas for the texture
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Failed to get 2D context for texture generation');
    // Return a blank texture as fallback
    return new THREE.Texture();
  }
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Create a radial gradient for the glow
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2;
  
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, radius
  );
  
  // Add color stops for a soft glow
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  
  // Fill with gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Generate quantum-themed font texture with glowing effect
 */
export function createQuantumFontTexture(text: string, fontSize = 64, color = '#00ffff'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Failed to get 2D context for font texture generation');
    return new THREE.Texture();
  }
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw glowing text
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Glow effect
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px 'Arial'`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width/2, canvas.height/2);
  
  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
} 