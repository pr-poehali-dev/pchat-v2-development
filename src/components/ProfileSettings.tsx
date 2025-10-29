import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { User } from '@/pages/Index';

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

export default function ProfileSettings({ 
  open, 
  onOpenChange, 
  user,
  onUpdate,
  onLogout
}: ProfileSettingsProps) {
  const [nickname, setNickname] = useState(user.nickname);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [theme, setTheme] = useState(user.theme);
  const [hideOnline, setHideOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) {
      toast.error('Введите ник');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/25098e9f-957d-48bd-8f99-07459fab8fe9', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_nickname',
          user_id: user.id,
          nickname
        })
      });

      if (!response.ok) {
        toast.error('Ошибка обновления');
        setLoading(false);
        return;
      }

      toast.success('Ник обновлен');
      onUpdate({ ...user, nickname });
      setLoading(false);
    } catch (error) {
      toast.error('Ошибка соединения');
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/25098e9f-957d-48bd-8f99-07459fab8fe9', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_avatar',
          user_id: user.id,
          avatar
        })
      });

      if (!response.ok) {
        toast.error('Ошибка обновления');
        setLoading(false);
        return;
      }

      toast.success('Аватар обновлен');
      onUpdate({ ...user, avatar });
      setLoading(false);
    } catch (error) {
      toast.error('Ошибка соединения');
      setLoading(false);
    }
  };

  const handleUpdateTheme = async (newTheme: string) => {
    setTheme(newTheme);
    
    try {
      const response = await fetch('https://functions.poehali.dev/25098e9f-957d-48bd-8f99-07459fab8fe9', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_theme',
          user_id: user.id,
          theme: newTheme
        })
      });

      if (response.ok) {
        toast.success('Тема обновлена');
        onUpdate({ ...user, theme: newTheme });
      }
    } catch (error) {
      toast.error('Ошибка соединения');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки профиля</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Юзернейм (нельзя изменить)</label>
            <Input
              value={user.username}
              disabled
              className="bg-muted/30"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Ник</label>
            <div className="flex gap-2">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-background/50"
              />
              <Button onClick={handleUpdateNickname} disabled={loading}>
                <Icon name="Check" size={18} />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Аватар</label>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-primary/30">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                    {user.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-input"
                />
                <label htmlFor="avatar-input">
                  <Button type="button" variant="outline" asChild>
                    <div>
                      <Icon name="Upload" size={18} />
                    </div>
                  </Button>
                </label>
                <Button onClick={handleUpdateAvatar} disabled={loading}>
                  <Icon name="Check" size={18} />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Тема</label>
            <Select value={theme} onValueChange={handleUpdateTheme}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Системная</SelectItem>
                <SelectItem value="light">Светлая</SelectItem>
                <SelectItem value="dark">Темная</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Скрыть статус в сети</label>
            <Switch checked={hideOnline} onCheckedChange={setHideOnline} />
          </div>

          <div className="pt-4 border-t border-border/30 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={onLogout}
            >
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти из аккаунта
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
                  toast.error('Функция удаления аккаунта пока недоступна');
                }
              }}
            >
              <Icon name="Trash2" size={18} className="mr-2" />
              Удалить аккаунт
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
