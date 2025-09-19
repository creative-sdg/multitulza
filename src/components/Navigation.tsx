import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (isHomePage) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/')}
        className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 shadow-lg"
      >
        <Home className="h-4 w-4 mr-2" />
        На главную
      </Button>
    </div>
  );
};

export default Navigation;