import React, { useState, useEffect } from 'react';
import {
  Flame,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  Timer,
  RefreshCw,
  Database,
  Terminal,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { decryptSecret, IntegrityCheckError } from '../lib/crypto';
import { getSecretMetadataApi, consumeSecretApi, getLiveRowCountApi } from '../lib/api';
import EnvViewer from './EnvViewer';

export default function RevealSecret({ secretId, initialHash, onNavigateHome }) {
  const [metadata, setMetadata] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [decryptedText, setDecryptedText] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [tamperError, setTamperError] = useState(false);

  // Auto-wipe clipboard countdown
  const [copiedWithWipe, setCopiedWithWipe] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Extract hash key from window.location.hash or initialHash prop
  const urlFragment = (initialHash || window.location.hash || '').replace(/^#/, '');

  // Step 1: Safe non-destructive metadata fetch (Anti-Link-Preview Protection)
  const fetchMetadata = async () => {
    setLoadingMeta(true);
    setErrorState(null);
    try {
      const data = await getSecretMetadataApi(secretId);
      setMetadata(data);
      if (!data.exists) {
        if (data.status === 'BURNED') {
          setErrorState({
            type: 'BURNED',
            title: 'Secret Already Burned & Destroyed',
            message:
              'This secret reached its view limit (0 views remaining) and was permanently purged from PostgreSQL. If this was a 1-view secret that was already opened on your laptop, it cannot be opened on your phone. To test on both devices, select "2 Views" when creating the secret!',
          });
        } else if (data.status === 'EXPIRED') {
          setErrorState({
            type: 'EXPIRED',
            title: 'Secret Has Expired',
            message: 'This secret exceeded its time-to-live and was purged by the background cleanup daemon.',
          });
        } else {
          setErrorState({
            type: 'NOT_FOUND',
            title: 'Secret Not Found',
            message: 'This secret does not exist, has expired, or the ID is invalid.',
          });
        }
      }
    } catch (err) {
      setErrorState({
        type: 'ERROR',
        title: 'Connection Error',
        message: err.message || 'Unable to connect to the backend server.',
      });
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [secretId]);

  // Step 2: Burn & Reveal Trigger
  const handleBurnAndReveal = async () => {
    if (!urlFragment) {
      setErrorState({
        type: 'NO_KEY',
        title: 'Decryption Key Missing',
        message:
          'The URL fragment (#key) is missing from your browser address bar. The server never had the key, so this secret cannot be decrypted.',
      });
      return;
    }

    if (metadata?.hasPassphrase && !passphrase.trim()) {
      alert('Please enter the secret passphrase.');
      return;
    }

    setRevealing(true);
    setTamperError(false);

    try {
      // 1. Consume secret from backend (atomically deleted)
      const consumed = await consumeSecretApi(secretId);

      // 2. Decrypt locally in browser using AES-256-GCM
      const decrypted = await decryptSecret({
        urlFragment,
        ciphertext: consumed.ciphertext,
        iv: consumed.iv,
        salt: consumed.salt,
        hasPassphrase: consumed.hasPassphrase,
        passphrase: passphrase.trim(),
      });

      setDecryptedText(decrypted.plaintext || decrypted.toString());
      if (decrypted.engine) {
        setBenchmark({
          engine: decrypted.engine,
          durationMs: decrypted.durationMs,
        });
      }
    } catch (err) {
      console.error('Reveal error:', err);
      if (err instanceof IntegrityCheckError || err.name === 'IntegrityCheckError') {
        setTamperError(true);
        setErrorState({
          type: 'TAMPER_DETECTED',
          title: 'INTEGRITY CHECK FAILED',
          message:
            'Ciphertext authentication tag verification failed! The ciphertext was tampered with in transit or storage, or an incorrect passphrase was entered.',
        });
      } else if (err.status === 410) {
        setErrorState({
          type: 'BURNED',
          title: 'Secret Already Burned',
          message:
            'Another client or browser just burned this secret. An intrusion alert was logged in real time.',
        });
      } else {
        setErrorState({
          type: 'ERROR',
          title: 'Decryption Error',
          message: err.message || 'Failed to reveal secret.',
        });
      }
    } finally {
      setRevealing(false);
    }
  };

  // Clipboard Auto-Wipe logic
  const handleCopyAndAutoWipe = async () => {
    if (!decryptedText) return;
    try {
      await navigator.clipboard.writeText(decryptedText);
      setCopiedWithWipe(true);
      setCountdown(30);

      // Start countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Overwrite clipboard with empty string for security
            navigator.clipboard.writeText('').catch(() => {});
            setCopiedWithWipe(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Loading state */}
      {loadingMeta && (
        <div className="p-12 rounded-2xl border border-slate-800 bg-slate-900/60 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-slate-400">Verifying secret metadata &amp; integrity...</p>
        </div>
      )}

      {/* Error or Burned state */}
      {!loadingMeta && errorState && (
        <div
          className={`rounded-2xl border p-6 shadow-2xl space-y-4 ${
            errorState.type === 'TAMPER_DETECTED'
              ? 'border-rose-500/80 bg-rose-950/30 animate-flash-danger'
              : errorState.type === 'BURNED'
              ? 'border-rose-500/50 bg-rose-950/20'
              : 'border-amber-500/50 bg-amber-950/20'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                {errorState.title}
                {errorState.type === 'TAMPER_DETECTED' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-bold uppercase">
                    Tamper Detected
                  </span>
                )}
              </h2>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">{errorState.message}</p>
            </div>
          </div>

          {errorState.type === 'BURNED' && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>INTRUSION ALERT BROADCAST</span>
              </div>
              <p>
                The creator's dashboard on Laptop A has received a live notification with your IP and device
                details. The secret row has 0 copies remaining in PostgreSQL.
              </p>
            </div>
          )}

          {errorState.type === 'TAMPER_DETECTED' && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-800 text-[11px] font-mono text-rose-300 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CRYPTOGRAPHIC TAMPER VERIFICATION</span>
              </div>
              <p>
                AES-256-GCM embeds a 128-bit authentication tag calculated over the entire ciphertext and IV.
                Because the ciphertext was modified by even a single bit in the database, decryption was aborted
                and rejected.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Back to Home
            </button>
            <button
              onClick={fetchMetadata}
              className="px-4 py-2 rounded-lg text-xs font-mono font-medium bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Metadata</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Anti-Link-Preview Warning Screen (Secret Exists, Not Yet Burned) */}
      {!loadingMeta && !errorState && !decryptedText && metadata && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono text-white">Encrypted Secret Ready</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Anti-Bot Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Viewing this secret will permanently burn and destroy it from the database.
              </p>
            </div>
          </div>

          {/* Anti-Link-Preview explanation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Two-Step Reveal Active</span>
            </div>
            <p className="text-xs font-mono text-slate-400 leading-relaxed">
              Messaging platforms (WhatsApp, Slack, Discord) routinely fetch web links to generate rich link
              previews. To protect your 1-time secret, loading this page did NOT burn it. It will only be
              destroyed when you manually click the burn button below.
            </p>
          </div>

          {/* Passphrase prompt if required */}
          {metadata.hasPassphrase && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-cyan-300">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <span>Passphrase Required</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="text-slate-400 hover:text-cyan-300 transition flex items-center gap-1 text-[11px]"
                >
                  {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassphrase ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter decryption passphrase..."
                  className="w-full text-xs font-mono bg-slate-950 border border-cyan-500/50 rounded-lg px-3 py-2 text-cyan-200 pr-10 focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Key is wrapped with PBKDF2 (100,000 rounds) combined with the URL hash fragment.
              </p>
            </div>
          )}

          {/* Secret Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Remaining Views</span>
              <span className="text-rose-400 font-bold text-sm">
                {metadata.remainingViews} {metadata.remainingViews === 1 ? 'view' : 'views'} left
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Expires At</span>
              <span className="text-amber-300 font-bold text-sm">
                {new Date(metadata.expiresAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Burn Button */}
          <button
            onClick={handleBurnAndReveal}
            disabled={revealing}
            className={`w-full py-4 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition shadow-xl ${
              revealing
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white shadow-rose-500/20 active:scale-98'
            }`}
          >
            {revealing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Atomically Burning &amp; Decrypting...</span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 fill-white animate-bounce" />
                <span className="text-base font-extrabold tracking-wide">👉 Click Here to Burn &amp; Reveal Secret</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Decrypted Content Display (Burned from DB) */}
      {decryptedText && (
        <div className="space-y-4 animate-fade-in">
          {/* Burned Confirmation Banner */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold">Secret Decrypted &amp; Burned</p>
                <p className="text-[11px] font-mono text-emerald-400/80">
                  Database record was atomically deleted. 0 copies remain on the server.
                </p>
              </div>
            </div>

            {/* Copy & Auto-Wipe Clipboard button */}
            <button
              onClick={handleCopyAndAutoWipe}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition shadow-sm ${
                copiedWithWipe
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {copiedWithWipe ? (
                <>
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  <span>Clipboard wiping in {countdown}s</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy &amp; Auto-Wipe (30s)</span>
                </>
              )}
            </button>
          </div>

          {/* Cryptographic Execution Benchmark */}
          {benchmark && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>Engine: <strong>{benchmark.engine}</strong></span>
              </div>
              <span className="text-emerald-400 font-bold">Decrypted in {benchmark.durationMs}ms</span>
            </div>
          )}

          {/* Syntax Highlighted Decrypted Content */}
          <EnvViewer content={decryptedText} title="Decrypted Secret (.env)" />

          {/* Post-reveal navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onNavigateHome}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 transition"
            >
              ← Back to Create New Secret
            </button>
            <span className="text-[11px] font-mono text-slate-600">ZeroBurn Zero-Knowledge Architecture</span>
          </div>
        </div>
      )}
    </div>
  );
}
