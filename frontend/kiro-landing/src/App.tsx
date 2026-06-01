import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import { Audiences } from './sections/Audiences';
import { HowItWorks } from './sections/HowItWorks';
import { Stats } from './sections/Stats';
import { ComingSoon } from './sections/ComingSoon';
import { CTAFinal } from './sections/CTAFinal';
import { Footer } from './sections/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--fg-1)] relative overflow-x-hidden">
      <BackgroundGlow />
      <Nav />
      <main>
        <Hero />
        <Audiences />
        <HowItWorks />
        <Stats />
        <ComingSoon />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}

function BackgroundGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 0,
        background:
          'radial-gradient(900px 600px at 10% -10%, rgba(0,255,135,0.07), transparent 60%), radial-gradient(900px 600px at 100% 110%, rgba(123,44,191,0.10), transparent 60%)',
      }}
    />
  );
}
