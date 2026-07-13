import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  loginHref?: string;
}

export function DashboardError({
  title = 'Veri yüklenemedi',
  message,
  onRetry,
  loginHref = '/garson/giris/',
}: DashboardErrorProps) {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" aria-hidden />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Yeniden dene
          </Button>
        )}
        <Button asChild>
          <a href={loginHref}>GarsonAI giriş</a>
        </Button>
      </CardContent>
    </Card>
  );
}
