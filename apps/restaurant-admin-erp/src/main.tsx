import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { MOCK_TENANTS } from '@/data/mock-data';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TenantProvider tenants={MOCK_TENANTS}>
        <App />
      </TenantProvider>
    </ThemeProvider>
  </StrictMode>,
);
