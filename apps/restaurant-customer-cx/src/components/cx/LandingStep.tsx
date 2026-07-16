import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock3, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { RestaurantProfile } from '@/data/cx-api';

interface LandingStepProps {
  restaurant: RestaurantProfile;
  onContinue: () => void;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Pzt',
  tue: 'Sal',
  wed: 'Çar',
  thu: 'Per',
  fri: 'Cum',
  sat: 'Cmt',
  sun: 'Paz',
};

export function LandingStep({ restaurant, onContinue }: LandingStepProps) {
  const hours = Object.entries(restaurant.workingHours);
  const social = Object.entries(restaurant.socialLinks);

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative -mx-4 overflow-hidden sm:-mx-6"
      >
        <div
          className="min-h-[42vh] bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(20,17,15,0.15), rgba(20,17,15,0.72)), url(${
              restaurant.coverImageUrl || '/assets/images/og-image.png'
            })`,
          }}
        >
          <div className="flex min-h-[42vh] flex-col justify-end px-5 pb-6 pt-16 text-white sm:px-8">
            <div className="mb-3 flex items-center gap-3">
              <img
                src={restaurant.logoUrl || '/assets/brand/istebul-icon.svg'}
                alt=""
                className="h-12 w-12 rounded-xl border border-white/30 bg-white/90 object-cover"
              />
              <Badge className="bg-white/15 text-white">Restaurant OS</Badge>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {restaurant.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">{restaurant.description}</p>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-3">
        <Card>
          <CardContent className="space-y-3 p-4 text-sm">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {restaurant.address || 'Adres yakında'}
                {restaurant.city ? ` · ${restaurant.city}` : ''}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span>{restaurant.phone || 'Telefon yakında'}</span>
            </p>
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex flex-wrap gap-2">
                {hours.length === 0 ? (
                  <span>Çalışma saatleri yakında</span>
                ) : (
                  hours.map(([day, value]) => (
                    <Badge key={day} variant="secondary">
                      {DAY_LABELS[day] || day}: {value}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {social.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {social.map(([network, href]) => (
              <a
                key={network}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-3 py-1.5 text-xs capitalize"
              >
                {network}
              </a>
            ))}
          </div>
        ) : null}

        {restaurant.campaigns.length > 0 ? (
          <Card>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium">Kampanyalar</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {restaurant.campaigns.map((campaign) => (
                  <li key={campaign}>• {campaign}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button className="w-full" size="default" onClick={onContinue}>
          Rezervasyona başla
        </Button>
        <Button asChild className="w-full" size="default" variant="outline">
          <Link to={`/${encodeURIComponent(restaurant.slug)}/concierge`}>
            AI Concierge ile konuş
          </Link>
        </Button>
      </div>
    </div>
  );
}
