import { Button } from '@/components/ui/button';
import { Video, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VideoGenerator = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-6 mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Генератор видео вариантов
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Создавайте множественные варианты видео с разными размерами и брендами используя Creatomate API
          </p>
        </div>

        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Выберите сценарий работы</h2>
            <p className="text-muted-foreground">
              Определите, какой тип видео вы хотите создать
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Button
              onClick={() => navigate('/resize-rebrand')}
              className="h-32 flex-col gap-4 bg-video-surface-elevated hover:bg-video-primary/10 text-foreground border border-video-primary/30"
              variant="outline"
            >
              <Video className="h-8 w-8 text-video-primary" />
              <div className="text-center">
                <div className="font-semibold">Ресайзы + Ребренды</div>
                <div className="text-sm text-muted-foreground">
                  Без работы над текстом. Загрузите видео с готовой озвучкой
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => navigate('/chunked-audio')}
              className="h-32 flex-col gap-4 bg-video-surface-elevated hover:bg-video-primary/10 text-foreground border border-video-primary/30"
              variant="outline"
            >
              <Zap className="h-8 w-8 text-video-primary" />
              <div className="text-center">
                <div className="font-semibold">Сбор аудио- и видеоэлементов</div>
                <div className="text-sm text-muted-foreground">
                  Работа над текстом. Каждый текст озвучивается отдельно
                </div>
              </div>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            <p>
              Первый сценарий идеален для готовых видео, которые нужно адаптировать под разные форматы и бренды.
              Второй сценарий подходит для создания видео с нуля из отдельных текстовых блоков.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
