import { Game } from './components/Game.js';

// Add error handler
window.addEventListener('error', function(event) {
    console.error('ERROR:', event.message, 'at', event.filename, 'line', event.lineno);
    alert('Error occurred: ' + event.message);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        const game = new Game();
        game.init();
        
        console.log('Game initialized, starting game loop...');
        
        // Start the game loop
        function gameLoop() {
            game.update();
            game.render();
            requestAnimationFrame(gameLoop);
        }
        
        gameLoop();
        console.log('Game loop started');
    } catch (error) {
        console.error('Game initialization error:', error);
        alert('Failed to initialize game: ' + error.message);
    }
}); 