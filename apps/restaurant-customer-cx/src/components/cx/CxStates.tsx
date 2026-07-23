import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CxLoading({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hazırlanıyor</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-2 animate-pulse rounded-full bg-muted" />
      </CardContent>
    </Card>
  );
}

export function CxError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Bir sorun oluştu</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {onRetry ? (
        <CardContent>
          <Button onClick={onRetry}>Tekrar dene</Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function CxEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
