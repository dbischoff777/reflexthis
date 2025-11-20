import Link from 'next/link';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { BuildInfo } from '@/components/BuildInfo';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 overflow-hidden">
      <CyberpunkBackground />
      
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl text-center">
        {/* Hero Section */}
        <div className="mb-8 space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-primary text-glow mb-4 tracking-tight">
            ReflexThis
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Test your reflexes in this cyberpunk-inspired game
          </p>
        </div>
        
        {/* Start Game Button */}
        <Link 
          href="/game"
          className="group relative inline-flex items-center justify-center min-h-[56px] px-8 py-4 text-lg sm:text-xl font-bold rounded-full bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <span className="relative z-10">Start Game</span>
          
          {/* Shine effect */}
          <span 
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'shine 3s infinite',
            }}
          />
        </Link>
      </main>
      
      {/* Build Info Footer */}
      <footer className="relative z-10 w-full flex justify-center pb-4">
        <BuildInfo className="text-center" />
      </footer>
    </div>
  );
}
