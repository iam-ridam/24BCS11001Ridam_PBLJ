import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CreateSecret from './components/CreateSecret';
import SecretLinkModal from './components/SecretLinkModal';
import SecurityConsole from './components/SecurityConsole';
import RevealSecret from './components/RevealSecret';
import { getAlertHistoryApi, getCreatorToken } from './lib/api';
import { subscribeToAlerts } from './lib/sse';
import { Shield, Lock, Terminal, Cpu, Flame, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'console'
  const [createdSecretModal, setCreatedSecretModal] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [sseConnected, setSseConnected] = useState(false);

  // Check if current URL is a secret reveal link: /s/:secretId
  const [routeSecretId, setRouteSecretId] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/s/')) {
      return path.replace('/s/', '').split('/')[0];
    }
    return null;
  });

  // Handle browser popstate / back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/s/')) {
        setRouteSecretId(path.replace('/s/', '').split('/')[0]);
      } else {
        setRouteSecretId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Connect to SSE alert stream on Laptop A
  useEffect(() => {
    const creatorToken = getCreatorToken();

    // 1. Load initial history
    getAlertHistoryApi(creatorToken)
      .then((history) => {
        setAlerts(history);
      })
      .catch((err) => console.warn('History load failed:', err));

    // 2. Subscribe to real-time SSE stream
    const unsubscribe = subscribeToAlerts(creatorToken, {
      onConnected: () => {
        setSseConnected(true);
      },
      onAlert: (newAlert) => {
        setAlerts((prev) => [newAlert, ...prev]);

        // Optional: sound effect on intrusion
        if (newAlert.eventType === 'INTRUSION_ATTEMPT') {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch {
            // AudioContext may be restricted by autoplay policy
          }
        }
      },
      onError: () => {
        setSseConnected(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSecretCreated = (secretData) => {
    setCreatedSecretModal(secretData);
  };

  const handleOpenSecret = (url) => {
    const urlObj = new URL(url);
    window.history.pushState({}, '', urlObj.pathname + urlObj.hash);
    setRouteSecretId(urlObj.pathname.replace('/s/', ''));
    setCreatedSecretModal(null);
  };

  const handleNavigateHome = () => {
    window.history.pushState({}, '', '/');
    setRouteSecretId(null);
    setActiveTab('create');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Global Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (routeSecretId) {
            handleNavigateHome();
          }
          setActiveTab(tab);
        }}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {routeSecretId ? (
          <RevealSecret
            secretId={routeSecretId}
            initialHash={window.location.hash}
            onNavigateHome={handleNavigateHome}
          />
        ) : activeTab === 'create' ? (
          <CreateSecret onSecretCreated={handleSecretCreated} />
        ) : (
          <SecurityConsole
            alerts={alerts}
            isConnected={sseConnected}
            onSelectSecret={handleOpenSecret}
          />
        )}
      </main>

      {/* Secret Creation Success Modal with QR Code */}
      {createdSecretModal && (
        <SecretLinkModal
          secretData={createdSecretModal}
          onClose={() => setCreatedSecretModal(null)}
          onOpenSecret={handleOpenSecret}
        />
      )}

      {/* Security Architecture Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-12 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-slate-200">ZeroBurn Enterprise Vault</span>
            <span>•</span>
            <span>Zero-Knowledge Architecture</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              PostgreSQL / H2 Atomic DELETE
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              AES-256-GCM + PBKDF2
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-rose-400" />
              Real-Time SSE Alert Bus
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
