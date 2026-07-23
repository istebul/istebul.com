import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CONCIERGE_QUICK_PICKS,
  createAIConcierge,
  type AIConcierge,
  type ConciergeChatMessage,
  type ConciergeSuggestionCard,
} from '@istebul/ai-concierge';
import { createConciergePaymentBridge } from '@istebul/payment-gateway';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AiConciergeChatProps {
  restaurantSlug: string;
  restaurantId: string;
  restaurantName: string;
}

function TypingDots() {
  return (
    <div
      className="flex max-w-[90%] items-center gap-1 rounded-2xl bg-card px-3 py-2 text-sm shadow-sm"
      aria-live="polite"
      aria-label="Yazıyor"
    >
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
    </div>
  );
}

function SuggestionCards({
  cards,
  onPick,
  disabled,
}: {
  cards: ConciergeSuggestionCard[];
  onPick: (prompt: string) => void;
  disabled: boolean;
}) {
  if (!cards.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(card.prompt)}
          className="rounded-xl border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50"
        >
          <p className="font-medium">{card.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
        </button>
      ))}
    </div>
  );
}

export function AiConciergeChat({
  restaurantSlug,
  restaurantId,
  restaurantName,
}: AiConciergeChatProps) {
  const conciergeRef = useRef<AIConcierge | null>(null);
  const [messages, setMessages] = useState<ConciergeChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [cards, setCards] = useState<ConciergeSuggestionCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const concierge = useMemo(() => {
    const instance = createAIConcierge({
      restaurantSlug,
      restaurantId,
      restaurantName,
      provider: 'mock',
      seedDemo: true,
    });
    conciergeRef.current = instance;
    return instance;
  }, [restaurantSlug, restaurantId, restaurantName]);

  const paymentBridge = useMemo(
    () => createConciergePaymentBridge({ restaurantId, defaultProvider: 'mock' }),
    [restaurantId],
  );

  useEffect(() => {
    setMessages(concierge.getMessages());
    setCards([]);
    setError(null);
  }, [concierge]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, typing, cards]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput('');
    setError(null);
    setTyping(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `pending-u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const turn = await concierge.chat(trimmed);
      let nextMessages = turn.messages;
      const wantsPayment =
        /garanti|provizyon|ödeme|odeme|payment|authorize/i.test(trimmed) ||
        turn.intent.id === 'create_reservation' ||
        turn.intent.id === 'show_reservation_summary';

      if (wantsPayment) {
        const flow = await paymentBridge.runFromTurn(turn);
        nextMessages = [
          ...turn.messages,
          {
            id: `p8e-pay-${Date.now()}`,
            role: 'assistant',
            content: flow.conversationMessage,
            createdAt: new Date().toISOString(),
          },
        ];
      }

      setMessages(nextMessages);
      setCards(turn.suggestionCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Concierge yanıt veremedi.');
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-xl">AI Concierge</CardTitle>
          <p className="text-sm text-muted-foreground">
            {restaurantName} · doğal dil ile rezervasyon, masa, menü ve kampanya
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Hızlı Seçim
            </p>
            <div className="flex flex-wrap gap-2">
              {CONCIERGE_QUICK_PICKS.map((pick) => (
                <Button
                  key={pick.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={typing}
                  onClick={() => {
                    void sendText(pick.prompt);
                  }}
                >
                  {pick.label}
                </Button>
              ))}
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border bg-muted/30 p-3"
          >
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
                {message.content.split('\n').map((line, index) => (
                  <p key={`${message.id}-${index}`}>{line || '\u00a0'}</p>
                ))}
              </motion.div>
            ))}
            {typing ? <TypingDots /> : null}
          </div>

          {!typing && cards.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Öneri kartları</p>
              <SuggestionCards
                cards={cards}
                disabled={typing}
                onPick={(prompt) => {
                  void sendText(prompt);
                }}
              />
            </div>
          ) : null}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Örn. iki kişilik romantik masa, 20:00"
              disabled={typing}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void sendText(input);
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={typing || !input.trim()}
              onClick={() => {
                void sendText(input);
              }}
            >
              Gönder
            </Button>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">Mock provider</Badge>
            <span>remoteCallAttempted = false · OpenAI/Groq/xAI tek satırla açılabilir</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="w-full" variant="outline">
          <Link to={`/${encodeURIComponent(restaurantSlug)}`}>Restoran sayfasına dön</Link>
        </Button>
        <Button asChild className="w-full">
          <Link to={`/${encodeURIComponent(restaurantSlug)}`}>Rezervasyon adımlarına geç</Link>
        </Button>
      </div>
    </div>
  );
}
