import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import fighterSrc from '../assets/ships/fighter.glb?url';

// Cache for loaded models
const modelCache = new Map<string, any>();

/**
 * Preloads critical game assets to ensure they're available before rendering
 * @returns {Promise} Promise that resolves when all assets are loaded
 */
export async function preloadCriticalAssets(): Promise<void> {
    console.log("Preloading critical game assets...");
    
    try {
        // Create a GLTF loader
        const loader = new GLTFLoader();
        
        // Load the fighter model
        const fighterPromise = new Promise<void>((resolve, reject) => {
            console.log("Loading fighter model:", fighterSrc);
            loader.load(
                fighterSrc,
                (gltf) => {
                    // Store the loaded model in cache
                    modelCache.set('fighter', gltf);
                    console.log("Fighter model loaded successfully");
                    resolve();
                },
                (progress) => {
                    // Log loading progress
                    if (progress.lengthComputable) {
                        const percentage = Math.round((progress.loaded / progress.total) * 100);
                        if (percentage % 20 === 0) { // Log every 20%
                            console.log(`Fighter model loading: ${percentage}%`);
                        }
                    }
                },
                (error) => {
                    console.error("Error loading fighter model:", error);
                    reject(error);
                }
            );
        });
        
        // Wait for all assets to load
        await Promise.all([fighterPromise]);
        
        console.log("All critical assets preloaded successfully");
    } catch (error) {
        console.error("Error preloading assets:", error);
        throw error;
    }
}

/**
 * Gets a preloaded model from the cache
 * @param {string} key - Model identifier key
 * @returns {any} The loaded model or undefined if not found
 */
export function getPreloadedModel(key: string): any {
    return modelCache.get(key);
}

/**
 * Checks if a critical model is loaded
 * @param {string} key - Model identifier key
 * @returns {boolean} True if the model is loaded, false otherwise
 */
export function isModelLoaded(key: string): boolean {
    return modelCache.has(key);
} 