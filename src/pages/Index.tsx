import { useState, useEffect } from 'react';
import AuthScreen from '@/components/AuthScreen';
import ChatList from '@/components/ChatList';
import ChatView from '@/components/ChatView';

export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  theme: string;
}

export interface Chat {
  id: number;
  name: string;
  avatar: string | null;
  is_group: boolean;
  creator_id: number | null;
  last_message: string | null;
  last_message_time: string | null;
  other_username?: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('pchat_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pchat_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setActiveChat(null);
    localStorage.removeItem('pchat_user');
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {!activeChat ? (
          <ChatList 
            user={user} 
            onSelectChat={setActiveChat}
            onLogout={handleLogout}
          />
        ) : (
          <ChatView 
            user={user} 
            chat={activeChat} 
            onBack={() => setActiveChat(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-[30%] min-w-[320px] max-w-[400px] border-r border-border">
        <ChatList 
          user={user} 
          onSelectChat={setActiveChat}
          onLogout={handleLogout}
          activeChat={activeChat}
        />
      </div>
      <div className="flex-1">
        {activeChat ? (
          <ChatView 
            user={user} 
            chat={activeChat} 
            onBack={() => setActiveChat(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-xl">Выберите чат для начала переписки</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}