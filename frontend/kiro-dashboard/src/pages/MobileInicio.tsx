import { useNavigate } from 'react-router-dom';
import { MobileBalanceCard } from '@/components/mobile/MobileBalanceCard';
import { MobileActivityCard } from '@/components/mobile/MobileActivityCard';

interface MobileInicioProps {
  onReceive: () => void;
}

export default function MobileInicio({ onReceive }: MobileInicioProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <MobileBalanceCard onReceive={onReceive} />
      <MobileActivityCard onSeeAll={() => navigate('/transacoes')} />
    </div>
  );
}
