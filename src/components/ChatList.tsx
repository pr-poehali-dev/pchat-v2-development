import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import ProfileSettings from '@/components/ProfileSettings';
import type { User, Chat } from '@/pages/Index';

interface ChatListProps {
  user: User;
  onSelectChat: (chat: Chat) => void;
  onLogout: () => void;
  activeChat?: Chat | null;
}

export default function ChatList({ user, onSelectChat, onLogout, activeChat }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const loadChats = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/eb5187df-736f-4f3f-ab42-b9ea5b5b4e7c?user_id=${user.id}`
      );
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleCreateChat = async () => {
    if (!newChatUsername.trim()) {
      toast.error('Введите юзернейм');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/eb5187df-736f-4f3f-ab42-b9ea5b5b4e7c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_personal',
          user_id: user.id,
          other_username: newChatUsername
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Ошибка');
        setLoading(false);
        return;
      }

      if (data.existing) {
        toast.info('Чат уже существует');
      } else {
        toast.success('Чат создан');
      }

      setNewChatUsername('');
      setIsDialogOpen(false);
      await loadChats();
      setLoading(false);
    } catch (error) {
      toast.error('Ошибка соединения');
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="h-screen flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="p-4 border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PChat
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="hover:bg-primary/20"
          >
            <Icon name="Settings" size={20} />
          </Button>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 bg-primary/20 hover:bg-primary/30 text-foreground border border-primary/50">
                <Icon name="UserPlus" size={18} className="mr-2" />
                Новый чат
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle>Создать чат</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Юзернейм"
                  value={newChatUsername}
                  onChange={(e) => setNewChatUsername(e.target.value)}
                  className="bg-background/50"
                />
                <Button
                  onClick={handleCreateChat}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? 'Создание...' : 'Создать'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => setIsGroupDialogOpen(true)}
            className="bg-accent/20 hover:bg-accent/30 text-foreground border border-accent/50"
          >
            <Icon name="Users" size={18} />
          </Button>
        </div>
        
        <CreateGroupDialog
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          user={currentUser}
          chats={chats}
          onGroupCreated={loadChats}
        />
        
        <ProfileSettings
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          user={currentUser}
          onUpdate={(updatedUser) => {
            setCurrentUser(updatedUser);
            localStorage.setItem('pchat_user', JSON.stringify(updatedUser));
          }}
          onLogout={onLogout}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Нет чатов</p>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-primary/10 transition-colors border-b border-border/30 ${
                activeChat?.id === chat.id ? 'bg-primary/20' : ''
              }`}
            >
              <Avatar className="w-12 h-12 border-2 border-primary/30">
                {chat.avatar ? (
                  <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    {chat.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold truncate text-foreground">
                    {chat.name || 'Чат'}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatTime(chat.last_message_time)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {chat.last_message || 'Нет сообщений'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}