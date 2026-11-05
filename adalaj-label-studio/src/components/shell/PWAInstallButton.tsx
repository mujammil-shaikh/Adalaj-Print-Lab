/**
 * PWA Install Button and Offline Connectivity Indicator
 * Implements compliant standalone install prompt and offline notice
 */

import React, { useEffect, useState } from 'react';
import { Download, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstallClick}
        aria-label="Install Adalaj Print Lab application"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-black transition-colors focus:ring-2 focus:ring-amber-300"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
        >
          <Download className="w-3 h-3" />
          Install iOS
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-lg bg-zinc-900 border border-zinc-700 p-5 shadow-2xl">
              <h3 className="text-base font-bold text-zinc-100">Install on iPhone / iPad</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                1. Tap the <strong>Share</strong> button in the Safari toolbar.<br />
                2. Select <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded bg-zinc-800 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-12 left-4 z-50 flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-black shadow-lg border border-amber-400">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Offline Mode — All changes operate locally and safely in IndexedDB</span>
    </div>
  );
};
