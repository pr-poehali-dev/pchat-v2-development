import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface VoiceMessagePreviewProps {
  audioBlob: Blob;
  recordingTime: number;
  onSend: (caption?: string) => void;
  onCancel: () => void;
}

export const VoiceMessagePreview: React.FC<VoiceMessagePreviewProps> = ({
  audioBlob,
  recordingTime,
  onSend,
  onCancel,
}) => {
  const [caption, setCaption] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    audioUrlRef.current = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrlRef.current);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [audioBlob]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    onSend(caption || undefined);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold">Голосовое сообщение</h3>

        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
            className="shrink-0"
          >
            <Icon name={isPlaying ? 'Pause' : 'Play'} size={20} />
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-1 bg-muted rounded-full flex-1 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(currentTime / recordingTime) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(recordingTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Icon name="Mic" size={16} />
          </div>
        </div>

        <div>
          <Input
            placeholder="Добавить подпись (необязательно)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Отмена
          </Button>
          <Button onClick={handleSend} className="flex-1">
            Отправить
          </Button>
        </div>
      </div>
    </div>
  );
};
