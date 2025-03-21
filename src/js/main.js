/**
 * Main entry point for Quantum Drift game
 * Handles game initialization and startup
 */

// Check if running in browser context
if (typeof window !== 'undefined') {
    // Initialize game when page is loaded
    window.addEventListener('DOMContentLoaded', () => {
        // Create game instance
        console.log("Initializing Quantum Drift game...");
        window.game = new Game();
        
        // Log for debugging
        console.log("Game initialized successfully!");
    });
}

/**
 * Quantum Drift Game Instructions
 * 
 * Controls:
 * - WASD or Arrow Keys: Control vehicle
 * - Space: Boost (consumes quantum particles)
 * - Escape: Pause/Resume game
 * 
 * Gameplay:
 * - Collect quantum particles to increase your power level
 * - Use boost to increase speed and trigger reality distortion
 * - Stay on the track to maintain speed
 * - At high speeds, reality warps and the track morphs
 * - See how far you can travel before quantum collapse!
 */ 