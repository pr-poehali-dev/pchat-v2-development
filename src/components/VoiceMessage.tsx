import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface VoiceMessageProps {
  voiceUrl: string;
  duration: number;
  caption?: string;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({ voiceUrl, duration, caption }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(voiceUrl);
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
      audio.src = '';
    };
  }, [voiceUrl]);

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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 min-w-[200px]">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayback}
          className="shrink-0 h-8 w-8"
        >
          <Icon name={isPlaying ? 'Pause' : 'Play'} size={16} />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${(currentTime / duration) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(isPlaying ? currentTime : 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Icon name="Mic" size={14} className="text-muted-foreground shrink-0" />
      </div>
      {caption && <p className="text-sm">{caption}</p>}
    </div>
  );
};
