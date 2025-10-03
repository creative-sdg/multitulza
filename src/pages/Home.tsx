import { Button } from '@/components/ui/button';
import { Video, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Инструменты для работы с видео
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Выберите нужный инструмент для работы
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Button
            onClick={() => navigate('/video-generator')}
            className="h-48 flex-col gap-6 bg-video-surface-elevated hover:bg-video-primary/10 text-foreground border-2 border-video-primary/30 hover:border-video-primary/50 transition-all"
            variant="outline"
          >
            <Video className="h-12 w-12 text-video-primary" />
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold">Генератор видео-вариантов</div>
              <div className="text-sm text-muted-foreground">
                Создавайте множественные варианты видео с разными размерами и брендами
              </div>
            </div>
          </Button>
          
          <Button
            onClick={() => navigate('/character-studio')}
            className="h-48 flex-col gap-6 bg-video-surface-elevated hover:bg-video-primary/10 text-foreground border-2 border-video-primary/30 hover:border-video-primary/50 transition-all"
            variant="outline"
          >
            <Wrench className="h-12 w-12 text-video-primary" />
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold">Character Studio</div>
              <div className="text-sm text-muted-foreground">
                Генерируйте персонажей с AI: профиль, сцены, изображения и видео
              </div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;