import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { User, Chat } from '@/pages/Index';

interface Message {
  id: number;
  sender_id: number;
  sender_nickname: string;
  sender_username: string;
  content: string;
  photo_url: string | null;
  photo_caption: string | null;
  is_edited: boolean;
  is_read: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  is_creator: boolean;
}

interface ChatViewProps {
  user: User;
  chat: Chat;
  onBack: () => void;
}

export default function ChatView({ user, chat, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number>(0);
  const shouldScrollRef = useRef<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/3c819211-4c93-4d90-a7ff-2493141d605b?chat_id=${chat.id}`
      );
      const data = await response.json();
      const newMessages = data.messages || [];
      
      setMessages(prevMessages => {
        const lastId = prevMessages.length > 0 ? prevMessages[prevMessages.length - 1]?.id : 0;
        const newLastId = newMessages.length > 0 ? newMessages[newMessages.length - 1]?.id : 0;
        
        if (newLastId > lastId) {
          shouldScrollRef.current = true;
          lastMessageIdRef.current = newLastId;
          
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.sender_id !== user.id && !lastMessage.is_system) {
            audioRef.current?.play().catch(() => {});
          }
        }
        
        return newMessages;
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [chat.id, user.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  useEffect(() => {
    if (messages.length > 0 && shouldScrollRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !photoPreview) return;
    if (sending) return;

    setSending(true);
    shouldScrollRef.current = true;

    const tempMessage: Message = {
      id: Date.now(),
      sender_id: user.id,
      sender_nickname: user.nickname,
      sender_username: user.username,
      content: newMessage,
      photo_url: photoPreview,
      photo_caption: photoCaption,
      is_edited: false,
      is_read: false,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMessage]);
    const messageText = newMessage;
    const messagePhoto = photoPreview;
    const messageCaption = photoCaption;
    
    setNewMessage('');
    setPhotoPreview(null);
    setPhotoCaption('');

    try {
      await fetch('https://functions.poehali.dev/3c819211-4c93-4d90-a7ff-2493141d605b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat.id,
          sender_id: user.id,
          content: messageText,
          photo_url: messagePhoto,
          photo_caption: messageCaption
        })
      });

      await loadMessages();
    } catch (error) {
      toast.error('Ошибка отправки');
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageText);
      setPhotoPreview(messagePhoto);
      setPhotoCaption(messageCaption);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !newMessage.trim()) return;
    if (sending) return;

    setSending(true);

    try {
      await fetch('https://functions.poehali.dev/3c819211-4c93-4d90-a7ff-2493141d605b', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          message_id: editingMessage.id,
          content: newMessage
        })
      });

      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id 
          ? { ...m, content: newMessage, is_edited: true, updated_at: new Date().toISOString() }
          : m
      ));

      setEditingMessage(null);
      setNewMessage('');
      toast.success('Сообщение изменено');
      await loadMessages();
    } catch (error) {
      toast.error('Ошибка редактирования');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await fetch('https://functions.poehali.dev/3c819211-4c93-4d90-a7ff-2493141d605b', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId })
      });

      setMessages(prev => prev.filter(m => m.id !== messageId));
      setSelectedMessage(null);
      toast.success('Сообщение удалено');
      await loadMessages();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Файл слишком большой (макс. 5МБ)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadParticipants = async () => {
    if (!chat.is_group) return;
    
    try {
      const response = await fetch(
        `https://functions.poehali.dev/0626e1aa-311f-4d69-8a75-88cbee535b25?chat_id=${chat.id}`
      );
      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Вы уверены, что хотите покинуть группу?')) return;

    try {
      await fetch('https://functions.poehali.dev/0626e1aa-311f-4d69-8a75-88cbee535b25', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          chat_id: chat.id,
          user_id: user.id
        })
      });

      toast.success('Вы покинули группу');
      onBack();
    } catch (error) {
      toast.error('Ошибка выхода');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Удалить участника из группы?')) return;

    try {
      await fetch('https://functions.poehali.dev/0626e1aa-311f-4d69-8a75-88cbee535b25', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_member',
          chat_id: chat.id,
          user_id: user.id,
          member_id: memberId
        })
      });

      toast.success('Участник удален');
      loadParticipants();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  useEffect(() => {
    if (chat.is_group && showParticipants) {
      loadParticipants();
    }
  }, [chat.id, chat.is_group, showParticipants]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    shouldScrollRef.current = isNearBottom;
  };

  return (
    <div className="h-screen flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="p-4 border-b border-border/50 bg-card/40 backdrop-blur flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <Icon name="ArrowLeft" size={20} />
        </Button>

        <Avatar className="w-10 h-10 border-2 border-primary/30">
          {chat.avatar ? (
            <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
              {chat.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{chat.name || 'Чат'}</h2>
          {chat.is_group && <p className="text-xs text-muted-foreground">Группа</p>}
        </div>

        {chat.is_group && (
          <div className="flex gap-2">
            {chat.creator_id === user.id && (
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Icon name="Settings" size={20} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowParticipants(true)}>
              <Icon name="Users" size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLeaveGroup} className="hover:bg-destructive/20">
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" onScroll={handleScroll}>
        {messages.map((message) => {
          const isOwn = message.sender_id === user.id;
          
          if (message.is_system) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="bg-muted/30 backdrop-blur-xl rounded-full px-4 py-2">
                  <p className="text-xs text-muted-foreground text-center">{message.content}</p>
                </div>
              </div>
            );
          }
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group animate-fade-in`}
              onContextMenu={(e) => {
                if (isOwn && !message.is_system) {
                  e.preventDefault();
                  setSelectedMessage(message);
                }
              }}
            >
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {chat.is_group && !isOwn && (
                  <span className="text-xs text-accent mb-1 px-2 font-medium">{message.sender_nickname}</span>
                )}
                
                <div
                  className={`rounded-2xl p-3 backdrop-blur-xl border ${
                    isOwn
                      ? 'bg-primary/20 border-primary/50 rounded-br-sm'
                      : 'bg-card/40 border-border/50 rounded-bl-sm'
                  }`}
                >
                  {message.photo_url && message.content !== '[Удалено]' && (
                    <img
                      src={message.photo_url}
                      alt="Photo"
                      className="rounded-lg mb-2 max-w-full max-h-64 object-cover"
                      loading="lazy"
                    />
                  )}
                  
                  {message.photo_caption && message.content !== '[Удалено]' && (
                    <p className="text-sm text-foreground mb-1">{message.photo_caption}</p>
                  )}
                  
                  {message.content && (
                    <p className={`text-foreground break-words ${message.content === '[Удалено]' ? 'italic text-muted-foreground' : ''}`}>
                      {message.content}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-1 justify-end">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.created_at)}
                    </span>
                    {message.is_edited && message.content !== '[Удалено]' && (
                      <span className="text-xs text-muted-foreground italic">изм.</span>
                    )}
                    {isOwn && message.content !== '[Удалено]' && (
                      <Icon
                        name={message.is_read ? 'CheckCheck' : 'Check'}
                        size={14}
                        className={message.is_read ? 'text-primary' : 'text-muted-foreground'}
                      />
                    )}
                  </div>
                </div>

                {isOwn && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingMessage(message);
                        setNewMessage(message.content);
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      <Icon name="Pencil" size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMessage(message.id)}
                      className="h-6 px-2 text-xs hover:bg-destructive/20"
                    >
                      <Icon name="Trash2" size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {photoPreview && (
        <div className="p-4 border-t border-border/50 bg-card/40">
          <div className="relative inline-block">
            <img src={photoPreview} alt="Preview" className="max-h-32 rounded-lg" />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setPhotoPreview(null)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive"
            >
              <Icon name="X" size={14} />
            </Button>
          </div>
          <Input
            placeholder="Подпись к фото..."
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            className="mt-2 bg-background/50"
          />
        </div>
      )}

      <div className="p-4 border-t border-border/50 bg-card/40 backdrop-blur">
        {editingMessage && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="Pencil" size={14} />
            <span>Редактирование</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
              className="ml-auto h-6"
            >
              Отмена
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
            id="photo-input"
          />
          <label htmlFor="photo-input">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hover:bg-primary/20"
              asChild
            >
              <div>
                <Icon name="Paperclip" size={20} />
              </div>
            </Button>
          </label>

          <Input
            placeholder="Сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                editingMessage ? handleEditMessage() : handleSendMessage();
              }
            }}
            className="flex-1 bg-background/50 backdrop-blur"
            disabled={sending}
          />

          <Button
            onClick={editingMessage ? handleEditMessage : handleSendMessage}
            className="bg-primary hover:bg-primary/90"
            disabled={(!newMessage.trim() && !photoPreview) || sending}
          >
            <Icon name="Send" size={20} />
          </Button>
        </div>
      </div>

      <Dialog open={selectedMessage !== null} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle>Действия с сообщением</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                if (selectedMessage) {
                  setEditingMessage(selectedMessage);
                  setNewMessage(selectedMessage.content);
                  setSelectedMessage(null);
                }
              }}
            >
              <Icon name="Pencil" size={18} className="mr-2" />
              Редактировать
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (selectedMessage) {
                  handleDeleteMessage(selectedMessage.id);
                }
              }}
            >
              <Icon name="Trash2" size={18} className="mr-2" />
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle>Участники группы</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/30">
                <Avatar className="w-10 h-10 border-2 border-primary/30">
                  {participant.avatar ? (
                    <img src={participant.avatar} alt={participant.nickname} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {participant.nickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{participant.nickname}</p>
                    {participant.is_creator && (
                      <Icon name="Crown" size={14} className="text-accent" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{participant.username}</p>
                </div>
                {chat.creator_id === user.id && !participant.is_creator && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMember(participant.id)}
                    className="hover:bg-destructive/20"
                  >
                    <Icon name="X" size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle>Настройки группы</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Функции управления группой скоро будут доступны
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}