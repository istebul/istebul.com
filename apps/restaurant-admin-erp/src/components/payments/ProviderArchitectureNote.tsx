import { listPaymentProviders } from '@/lib/payments';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProviderArchitectureNote() {
  const providers = listPaymentProviders();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Architecture</CardTitle>
        <CardDescription>Strategy Pattern · interface only · no live API</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {providers.map((provider) => (
          <Badge key={provider.code} variant="outline">
            {provider.displayName}Provider
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
