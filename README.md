# Quantum Drift

![Quantum Drift banner](/public/images/banner.png)

<p>
  <img src="https://img.shields.io/badge/React-19.0.0-blue?style=flat&colorA=18181B&colorB=28CF8D" alt="React Version">
  <img src="https://img.shields.io/badge/Three.js-0.173.0-green?style=flat&colorA=18181B&colorB=28CF8D" alt="Three.js Version">
  <img src="https://img.shields.io/badge/R3F-9.0.4-orange?style=flat&colorA=18181B&colorB=28CF8D" alt="React Three Fiber Version">
  <img src="https://img.shields.io/badge/Vite-6.2.0-purple?style=flat&colorA=18181B&colorB=28CF8D" alt="Vite Version">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat&colorA=18181B&colorB=28CF8D" alt="License">
</p>

**Quantum Drift** is a 3D racing game built with viber3d, combining the power of React Three Fiber with Koota ECS for game logic.

## Description

Quantum Drift is a fast-paced racing game set in a futuristic quantum realm where physics bend and reality warps. Players navigate through shifting landscapes and quantum anomalies, collecting power-ups and drifting through impossible turns.

## Documentation

Docs: [viber3d.instructa.ai](https://viber3d.instructa.ai/)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Start development server
npm run dev
# or
yarn dev
```

Visit `http://localhost:5173` to see your app in action.

## Project Structure

```
quantum-drift/
├── public/            # Static assets
├── src/
│   ├── components/    # React components (purely presentational)
│   ├── systems/       # ECS Systems for game logic updates
│   ├── traits/        # ECS Traits (components) describing entity data
│   ├── utils/         # Utility functions
│   ├── assets/        # 3D models, textures, images
│   ├── actions.ts     # Central actions to spawn or modify entities
│   ├── app.tsx        # Main React component (root of 3D scene)
│   ├── frameloop.ts   # Main ECS update loop
│   ├── main.tsx       # React app root, renders <App />
│   ├── startup.tsx    # Startup logic (initial spawns, intervals)
│   └── world.ts       # Creates the ECS world with default traits
├── .gitignore         # Git ignore file
├── index.html         # HTML template
├── package.json       # Project dependencies
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## Resources

- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber)
- [Drei Documentation](https://github.com/pmndrs/drei)
- [Three.js Documentation](https://threejs.org/docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/guide/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Created with [viber3d](https://github.com/regenrek/viber3d) - 2025