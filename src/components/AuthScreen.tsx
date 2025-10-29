import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { User } from '@/pages/Index';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUsername = (value: string) => {
    return /^[a-zA-Z0-9]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Заполните все поля');
      return;
    }

    if (!validateUsername(username)) {
      toast.error('Юзернейм может содержать только английские буквы и цифры');
      return;
    }

    if (isRegister && !nickname) {
      toast.error('Введите ник');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/0442c07d-c526-4392-8291-b3f8d0136aa7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRegister ? 'register' : 'login',
          username,
          password,
          nickname: isRegister ? nickname : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Ошибка');
        setLoading(false);
        return;
      }

      toast.success(isRegister ? 'Регистрация успешна!' : 'Добро пожаловать!');
      onLogin(data);
    } catch (error) {
      toast.error('Ошибка соединения');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md p-8 backdrop-blur-xl bg-card/40 border-border/50 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PChat
          </h1>
          <p className="text-muted-foreground mt-2">
            {isRegister ? 'Создать аккаунт' : 'Войти в аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Юзернейм (a-z, 0-9)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background/50 backdrop-blur border-border/50"
            />
          </div>

          {isRegister && (
            <div>
              <Input
                type="text"
                placeholder="Ник"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-background/50 backdrop-blur border-border/50"
              />
            </div>
          )}

          <div>
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/50 backdrop-blur border-border/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </Card>
    </div>
  );
}
