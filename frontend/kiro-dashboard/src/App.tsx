import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { ReceberPixModal } from '@/components/ReceberPixModal';
import { SacarPixModal } from '@/components/SacarPixModal';
import Resumo from '@/pages/Resumo';
// On /resumo, "Receber via PIX" triggers the off-ramp flow (TESOURO → BRL).
// On /recebimentos, the same prop name still means "receive a customer payment"
// — so each route wires the prop to a different handler.
import Transacoes from '@/pages/Transacoes';
import Recebimentos from '@/pages/Recebimentos';
import Configuracoes from '@/pages/Configuracoes';
import Placeholder from '@/pages/Placeholder';

/**
 * Application shell.
 *
 * Layout adapts at the `md` breakpoint (768px):
 * - Below md: MobileHeader at top, MobileBottomNav fixed at bottom.
 *   Content gets bottom padding so the last card clears the nav bar.
 * - At md and above: classic left Sidebar + sticky Header.
 *
 * The PIX modal is lifted to the root so any page (mobile or desktop)
 * can open it via the `onReceive` prop.
 */
export default function App() {
  const [pixOpen, setPixOpen] = useState(false);
  const openPix = () => setPixOpen(true);
  const closePix = () => setPixOpen(false);

  const [sacarOpen, setSacarOpen] = useState(false);
  const openSacar = () => setSacarOpen(true);
  const closeSacar = () => setSacarOpen(false);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden">
          <MobileHeader />
        </div>
        <div className="hidden md:block">
          <Header />
        </div>

        <div className="flex-1 overflow-auto relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 0,
              background:
                'radial-gradient(620px 460px at 18% 12%, rgba(0,255,135,0.05), transparent 60%), radial-gradient(620px 460px at 92% 100%, rgba(123,44,191,0.07), transparent 60%)',
            }}
          />
          <div
            className="relative px-4 pt-4 pb-[96px] md:px-7 md:pt-7 md:pb-10"
            style={{ zIndex: 1 }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/resumo" replace />} />
              <Route path="/resumo" element={<Resumo onReceive={openSacar} />} />
              <Route path="/transacoes" element={<Transacoes onReceive={openPix} />} />
              <Route path="/recebimentos" element={<Recebimentos onReceive={openPix} />} />
              <Route path="/extrato" element={<Placeholder name="Extrato" />} />
              <Route path="/links" element={<Placeholder name="Links de Pagamento" />} />
              <Route path="/clientes" element={<Placeholder name="Clientes" />} />
              <Route path="/relatorios" element={<Placeholder name="Relatórios" />} />
              <Route path="/integracoes" element={<Placeholder name="Integrações" />} />
              <Route path="/config" element={<Configuracoes />} />
              <Route path="/mais" element={<Placeholder name="Mais" />} />
              <Route path="*" element={<Navigate to="/resumo" replace />} />
            </Routes>
          </div>
        </div>
      </main>

      <div className="md:hidden">
        <MobileBottomNav />
      </div>

      <ReceberPixModal open={pixOpen} onClose={closePix} />
      <SacarPixModal open={sacarOpen} onClose={closeSacar} />
    </div>
  );
}
