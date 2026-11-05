import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-register service worker for offline PWA compliance
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New PWA content available');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  }
});

createRoot(document.getElementById('root')!).render(<App />);
