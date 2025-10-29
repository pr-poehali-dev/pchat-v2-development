import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { User, Chat } from '@/pages/Index';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  chats: Chat[];
  onGroupCreated: () => void;
}

export default function CreateGroupDialog({ 
  open, 
  onOpenChange, 
  user, 
  chats,
  onGroupCreated 
}: CreateGroupDialogProps) {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const personalChats = chats.filter(chat => !chat.is_group);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Введите название группы');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Выберите участников');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/eb5187df-736f-4f3f-ab42-b9ea5b5b4e7c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_group',
          user_id: user.id,
          name: groupName,
          avatar: groupAvatar,
          member_ids: selectedMembers
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Ошибка');
        setLoading(false);
        return;
      }

      toast.success('Группа создана');
      setStep(1);
      setGroupName('');
      setGroupAvatar('');
      setSelectedMembers([]);
      onOpenChange(false);
      onGroupCreated();
      setLoading(false);
    } catch (error) {
      toast.error('Ошибка соединения');
      setLoading(false);
    }
  };

  const toggleMember = (memberId: number) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Название группы</label>
            <Input
              placeholder="Название..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <Button onClick={() => setStep(2)} className="w-full bg-primary hover:bg-primary/90">
            Далее
          </Button>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Аватар группы</label>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-primary/30">
                {groupAvatar ? (
                  <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                    {groupName.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="group-avatar-input"
                />
                <label htmlFor="group-avatar-input">
                  <Button type="button" variant="outline" asChild>
                    <div>
                      <Icon name="Upload" size={18} className="mr-2" />
                      Загрузить
                    </div>
                  </Button>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Назад
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1 bg-primary hover:bg-primary/90">
              Далее
            </Button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Выберите участников ({selectedMembers.length})
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {personalChats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Нет доступных контактов
                </p>
              ) : (
                personalChats.map((chat) => {
                  const memberId = parseInt(chat.id.toString());
                  return (
                    <div
                      key={chat.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 cursor-pointer border border-border/30"
                      onClick={() => toggleMember(memberId)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(memberId)}
                        onCheckedChange={() => toggleMember(memberId)}
                      />
                      <Avatar className="w-10 h-10 border-2 border-primary/30">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                          {chat.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{chat.name}</p>
                        <p className="text-xs text-muted-foreground">@{chat.other_username}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Назад
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              disabled={loading || selectedMembers.length === 0}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? 'Создание...' : 'Создать группу'}
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setStep(1);
        setGroupName('');
        setGroupAvatar('');
        setSelectedMembers([]);
      }
    }}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle>
            Создать группу {step > 1 && `(${step}/3)`}
          </DialogTitle>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
