import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/enterprise-theme.css';
import './styles/theme.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

console.log('🟢 MAIN.TSX - React app starting...');

const registerPWA = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      const updateSW = registerSW({
        onNeedRefresh() {
          if (confirm('New content available. Reload?')) {
            updateSW(true);
          }
        },
        onOfflineReady() {
          console.log('TradeSphere is ready to work offline');
        },
      });
    } catch (error) {
      // Silently fail in development environments that don't support PWA
      console.log('PWA registration skipped (development environment)');
    }
  }
};

console.log('🟢 MAIN.TSX - Rendering App component');
console.log('⚠️ StrictMode DISABLED - Required for Supabase real-time subscriptions to work');

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
    <Toaster position="top-right" />
  </AuthProvider>
);

registerPWA();