/**
 * Utility functions for Quantum Drift game
 */

const Utils = {
    /**
     * Generate a random number between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number between min and max
     */
    random: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer between min and max
     */
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad: function(degrees) {
        return degrees * Math.PI / 180;
    },
    
    /**
     * Linear interpolation between two values
     * @param {number} a - First value
     * @param {number} b - Second value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp: function(a, b, t) {
        return a + (b - a) * t;
    },
    
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum bound
     * @param {number} max - Maximum bound
     * @returns {number} Clamped value
     */
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Calculate distance between two 3D points
     * @param {THREE.Vector3} p1 - First point
     * @param {THREE.Vector3} p2 - Second point
     * @returns {number} Distance between points
     */
    distance: function(p1, p2) {
        return p1.distanceTo(p2);
    },
    
    /**
     * Generate a color based on a value
     * @param {number} value - Value to base color on (0-1)
     * @returns {number} Three.js color
     */
    getColorFromValue: function(value) {
        // Create a vibrant color based on value
        const hue = (value * 270) % 360; // Cycle through colors
        return new THREE.Color(`hsl(${hue}, 100%, 50%)`);
    },
    
    /**
     * Apply quantum distortion effect to a value based on speed
     * @param {number} value - Original value 
     * @param {number} speed - Current speed (0-1)
     * @param {number} intensity - Effect intensity
     * @returns {number} Distorted value
     */
    quantumDistort: function(value, speed, intensity = 1.0) {
        // Apply sine wave distortion based on speed
        const distortion = Math.sin(speed * Math.PI * 2) * intensity;
        return value * (1 + distortion * 0.2);
    },
    
    /**
     * Generate a perlin noise value (simplified version)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    noise: function(x, y, z) {
        // Simplified noise function (for proper implementation, use a noise library)
        return Math.sin(x * 0.1 + y * 0.2 + z * 0.3) * 
               Math.cos(x * 0.2 + y * 0.3 + z * 0.1) * 0.5;
    },
    
    /**
     * Show an element by removing the hidden class
     * @param {string} elementId - ID of the element to show
     */
    showElement: function(elementId) {
        document.getElementById(elementId).classList.remove('hidden');
    },
    
    /**
     * Hide an element by adding the hidden class
     * @param {string} elementId - ID of the element to hide
     */
    hideElement: function(elementId) {
        document.getElementById(elementId).classList.add('hidden');
    },
    
    /**
     * Update text content of an element
     * @param {string} elementId - ID of the element to update
     * @param {string|number} value - New content value
     */
    updateElementText: function(elementId, value) {
        document.getElementById(elementId).textContent = value;
    }
};

// Export the Utils object
window.Utils = Utils; 