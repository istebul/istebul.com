import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ConciergeStepProps {
  restaurantName: string;
  onContinue: () => void;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

const OPENING =
  'Merhaba 👋\nBugün size nasıl yardımcı olabilirim?';

export function ConciergeStep({ restaurantName, onContinue }: ConciergeStepProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'open', role: 'assistant', text: OPENING },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Şimdilik yer tutucu AI yanıtı: “${text}”. ${restaurantName} için rezervasyon sihirbazına devam edebilirsiniz. LLM çağrısı henüz bağlı değil.`,
      },
    ]);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">AI Concierge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border bg-muted/30 p-3">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={
                  message.role === 'assistant'
                    ? 'max-w-[90%] rounded-2xl bg-card px-3 py-2 text-sm shadow-sm'
                    : 'ml-auto max-w-[90%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground'
                }
              >
                {message.text.split('\n').map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Örn. iki kişilik masa, 20:00"
              onKeyDown={(event) => {
                if (event.key === 'Enter') send();
              }}
            />
            <Button type="button" variant="secondary" onClick={send}>
              Gönder
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholder sohbet — gerçek LLM entegrasyonu sonraki fazda.
          </p>
        </CardContent>
      </Card>
      <Button className="w-full" onClick={onContinue}>
        Rezervasyon adımlarına geç
      </Button>
    </div>
  );
}
