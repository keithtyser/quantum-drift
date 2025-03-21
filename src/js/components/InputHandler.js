export class InputHandler {
    constructor(vehicle) {
        this.vehicle = vehicle;
        this.keys = {
            KeyW: 'accelerate',
            KeyS: 'brake',
            KeyA: 'turnLeft',
            KeyD: 'turnRight',
            ArrowUp: 'accelerate',
            ArrowDown: 'brake',
            ArrowLeft: 'turnLeft',
            ArrowRight: 'turnRight'
        };
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Handle key down events
        document.addEventListener('keydown', (event) => {
            const control = this.keys[event.code];
            if (control) {
                this.vehicle.setControl(control, true);
            }
        });
        
        // Handle key up events
        document.addEventListener('keyup', (event) => {
            const control = this.keys[event.code];
            if (control) {
                this.vehicle.setControl(control, false);
            }
        });
    }
    
    update() {
        // This method can be used for any additional input processing
        // that needs to happen each frame
    }
} 