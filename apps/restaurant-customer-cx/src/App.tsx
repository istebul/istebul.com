import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ConciergePage } from '@/pages/ConciergePage';
import { RestaurantCxPage } from '@/pages/RestaurantCxPage';

function SlugRoute() {
  const { restaurantSlug = '' } = useParams();
  return <RestaurantCxPage slug={decodeURIComponent(restaurantSlug)} />;
}

function ConciergeRoute() {
  const { restaurantSlug = '' } = useParams();
  return <ConciergePage slug={decodeURIComponent(restaurantSlug)} />;
}

export default function App() {
  return (
    <BrowserRouter basename="/r">
      <Routes>
        <Route path="/:restaurantSlug/concierge" element={<ConciergeRoute />} />
        <Route path="/:restaurantSlug" element={<SlugRoute />} />
        <Route path="/" element={<Navigate to="/demo-cafe" replace />} />
        <Route path="*" element={<Navigate to="/demo-cafe" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
