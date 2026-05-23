import { NavLink } from 'react-router-dom';
import { House, BarChart3, Menu, type LucideIcon } from 'lucide-react';

interface Tab {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: '/resumo', label: 'Início', Icon: House },
  { to: '/transacoes', label: 'Financeiro', Icon: BarChart3 },
  { to: '/mais', label: 'Mais', Icon: Menu },
];


export function MobileBottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-[var(--stroke-1)] bg-[var(--bg-0)]/95 backdrop-blur-md"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/resumo'}
          className={({ isActive }) => {
            const base =
              'flex flex-col items-center justify-center gap-[3px] flex-1 font-sans text-[11px] font-medium no-underline transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]';
            const active = 'text-[var(--kiro-green)]';
            const inactive = 'text-[var(--fg-3)] hover:text-[var(--fg-1)]';
            return [base, isActive ? active : inactive].join(' ');
          }}
          style={{ minHeight: 60, paddingTop: 8, paddingBottom: 8 }}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2 : 1.6} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
