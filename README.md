# ReflexThis 🎮

A cyberpunk-inspired reflex training game built with Next.js, shadcn/ui, and Tailwind CSS. Test your reflexes by pressing highlighted buttons as quickly as possible!

## 🎯 Features

- **3-4-3 Button Grid**: Unique layout with 10 circular buttons
- **Progressive Difficulty**: Speed increases and multiple buttons highlight as your score grows
- **Lives System**: 5 lives - game ends when all are lost
- **High Score Tracking**: Persistent high scores saved locally
- **Sound Effects**: Optional sound feedback with Web Audio API fallbacks
- **Mobile Optimized**: Designed for landscape orientation on smartphones
- **Cyberpunk Aesthetic**: Modern, sleek UI with neon accents and glow effects

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd reflexthis

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

## 🎮 How to Play

1. **Start the Game**: Click "Start Game" on the landing page
2. **Press Highlighted Buttons**: Buttons will light up - press them before they disappear!
3. **Score Points**: Each correct press increases your score
4. **Avoid Mistakes**: Wrong presses or missed buttons cost a life
5. **Survive**: Keep going until you lose all 5 lives
6. **Beat Your High Score**: Try to improve with each game!

### Difficulty Levels

- **Level 1 (Score 0-50)**: 1 button at a time, base speed
- **Level 2 (Score 51-150)**: 1-2 buttons simultaneously, 10% faster
- **Level 3 (Score 151+)**: 1-3 buttons simultaneously, up to 70% faster

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **State Management**: React Context API
- **Fonts**: Rajdhani (cyberpunk), Geist Sans, Geist Mono

## 📱 Mobile Optimization

- Optimized for landscape orientation
- Touch-optimized button interactions
- Responsive design for all screen sizes
- Performance optimizations for 60fps gameplay
- Orientation handler prompts users to rotate device

## 🎨 Customization

### Adding Sound Files

Place sound files in `public/sounds/`:
- `highlight.mp3` - Button highlight sound
- `success.mp3` - Correct button press
- `error.mp3` - Wrong button press
- `life-lost.mp3` - Life lost sound
- `game-over.mp3` - Game over sound

The game will automatically use Web Audio API fallbacks if files are missing.

### Styling

Cyberpunk theme colors are defined in `app/globals.css`. Customize:
- Primary: `#00ffff` (cyan)
- Secondary: `#ff00ff` (magenta)
- Background: `#0a0a0f` (dark)
- Surface: `#1a1a2e` (darker)

## 📦 Project Structure

```
reflexthis/
├── app/                  # Next.js App Router pages
│   ├── game/            # Game page
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Landing page
├── components/          # React components
│   ├── GameButton.tsx   # Game button component
│   ├── GameOverModal.tsx # Game over screen
│   ├── CyberpunkBackground.tsx # Animated background
│   └── ...
├── lib/                 # Utilities and logic
│   ├── GameContext.tsx  # Game state management
│   ├── gameUtils.ts     # Game logic utilities
│   ├── soundUtils.ts    # Sound system
│   └── ...
├── public/              # Static assets
│   └── sounds/         # Sound files (optional)
└── scripts/             # Build scripts
    └── build-info.js    # Build information generator
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build and test production build
npm run build
npm start
```

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

```bash
npm i -g vercel
vercel
```

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Styled with [Tailwind CSS](https://tailwindcss.com)

---

**Version**: 0.1.0  
**Build Date**: See footer on landing page
