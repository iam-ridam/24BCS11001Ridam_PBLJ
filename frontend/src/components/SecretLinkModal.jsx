import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Database,
  Flame,
  KeyRound,
  Lock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Wifi,
  Smartphone,
  Laptop,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { simulateTamperApi, getLiveRowCountApi, getNetworkInfoApi } from '../lib/api';

export default function SecretLinkModal({
  secretData,
  onClose,
  onOpenSecret,
  onTamperTriggered,
}) {
  const [copied, setCopied] = useState(false);
  const [tampered, setTampered] = useState(false);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [rowCount, setRowCount] = useState(1);
  const [checkingRow, setCheckingRow] = useState(false);

  // Network configuration for QR scanning
  const [lanIp, setLanIp] = useState('192.168.1.39');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [hostMode, setHostMode] = useState('tunnel'); // 'tunnel' | 'lan' | 'local' | 'custom'
  const [customHost, setCustomHost] = useState('');
  const [showNetworkHelp, setShowNetworkHelp] = useState(false);

  const { secretId, urlFragment, expiresAt, maxViews, hasPassphrase } = secretData;

  const currentPort = window.location.port || '5173';

  // Determine active URL for the QR code and shareable link
  let shareableUrl = '';
  if (hostMode === 'tunnel' && tunnelUrl) {
    shareableUrl = `${tunnelUrl.replace(/\/$/, '')}/s/${secretId}#${urlFragment}`;
  } else if (hostMode === 'local') {
    shareableUrl = `http://localhost:${currentPort}/s/${secretId}#${urlFragment}`;
  } else if (hostMode === 'custom' && customHost.trim()) {
    const raw = customHost.trim();
    const hostWithProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `http://${raw}`;
    shareableUrl = `${hostWithProto.replace(/\/$/, '')}/s/${secretId}#${urlFragment}`;
  } else {
    shareableUrl = `http://${lanIp || 'localhost'}:${currentPort}/s/${secretId}#${urlFragment}`;
  }

  const localhostUrl = `http://localhost:${currentPort}/s/${secretId}#${urlFragment}`;

  // Fetch host LAN IP & Tunnel URL from backend
  useEffect(() => {
    getNetworkInfoApi().then((info) => {
      if (info) {
        if (info.tunnelUrl) {
          setTunnelUrl(info.tunnelUrl);
          setHostMode('tunnel');
        } else {
          setHostMode('lan');
        }
        if (info.lanIp && info.lanIp !== '127.0.0.1' && info.lanIp !== 'localhost') {
          setLanIp(info.lanIp);
        } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          setLanIp(window.location.hostname);
        }
      }
    });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const checkLiveDbRow = async () => {
    setCheckingRow(true);
    try {
      const data = await getLiveRowCountApi(secretId);
      setRowCount(data.rowCount);
    } catch (err) {
      console.warn('Failed to check live row count:', err);
    } finally {
      setCheckingRow(false);
    }
  };

  useEffect(() => {
    checkLiveDbRow();
  }, [secretId]);

  const handleTamperTest = async () => {
    if (!confirm('Simulate Ciphertext Tampering? This will alter 1 character in PostgreSQL to verify that AES-256-GCM authentication tag verification rejects decryption.')) {
      return;
    }
    setTamperLoading(true);
    try {
      await simulateTamperApi(secretId);
      setTampered(true);
      onTamperTriggered && onTamperTriggered(secretId);
    } catch (err) {
      alert('Tamper simulation error: ' + err.message);
    } finally {
      setTamperLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden my-8">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-rose-500" />

        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                Secret Encrypted &amp; Ready
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  AES-256-GCM
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Key isolated in URL fragment (#). The server never receives the key.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Mobile LAN Host Selector Pill */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>QR Destination Target</span>
            </div>
            <button
              type="button"
              onClick={() => setShowNetworkHelp(!showNetworkHelp)}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Why LAN IP for Mobile?</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            {tunnelUrl && (
              <button
                type="button"
                onClick={() => setHostMode('tunnel')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  hostMode === 'tunnel'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-lg shadow-purple-500/10'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Globe className="w-3 h-3 text-purple-400" />
                <span>🌐 Mobile Tunnel (Instant Phone Access)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setHostMode('lan')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                hostMode === 'lan'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>Wi-Fi IP ({lanIp}:{currentPort})</span>
            </button>

            <button
              type="button"
              onClick={() => setHostMode('local')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                hostMode === 'local'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Laptop className="w-3 h-3 text-cyan-400" />
              <span>Laptop (localhost:{currentPort})</span>
            </button>

            <button
              type="button"
              onClick={() => setHostMode('custom')}
              className={`px-2.5 py-1 rounded-lg transition ${
                hostMode === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Custom
            </button>
          </div>

          {hostMode === 'custom' && (
            <input
              type="text"
              placeholder="e.g. 192.168.43.150:5173 or your-tunnel.ngrok.io"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              className="w-full text-xs font-mono bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-amber-200 focus:outline-none"
            />
          )}

          {showNetworkHelp && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 text-[11px] font-mono text-slate-300 space-y-1.5 animate-fade-in">
              <p className="text-emerald-400 font-bold">Why phones cannot use "localhost":</p>
              <p className="text-slate-400 leading-relaxed">
                "localhost" always refers to the device opening the link. If you scan a link containing "localhost" on your phone, the phone tries to load the website from inside the phone itself, resulting in a connection error.
              </p>
              <p className="text-slate-400 leading-relaxed">
                By setting the QR code to your Laptop's LAN IP (<strong className="text-white">{lanIp}</strong>), your phone loads the page directly from Laptop A over your shared Wi-Fi network or Mobile Hotspot!
              </p>
            </div>
          )}
        </div>

        {/* QR Code and Shareable Link Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 my-3 items-center">
          {/* QR Code (High contrast, 180px with clean white frame for effortless phone scanning) */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl shadow-2xl mx-auto">
            <QRCodeSVG
              value={shareableUrl}
              size={175}
              level="M"
              includeMargin={true}
              className="rounded"
            />
            <span className="text-[10px] font-mono text-slate-800 font-extrabold mt-1.5 text-center flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-600" />
              <span>Scan with Phone Camera</span>
            </span>
          </div>

          {/* Shareable Link + Actions */}
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 font-medium block mb-1">
                Shareable Burn Link ({hostMode === 'tunnel' ? '🌐 Public Mobile Link' : hostMode === 'lan' ? '📶 LAN Wi-Fi Link' : '💻 Localhost Link'})
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 pr-10 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono transition shadow-lg shadow-emerald-500/20 font-bold"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <a
                href={localhostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white font-mono transition shadow-sm"
                title="Open in new browser tab on this laptop (via localhost)"
              >
                <Laptop className="w-4 h-4" />
                <span>Open on Laptop</span>
              </a>
            </div>

            {/* Single View Warning */}
            {maxViews === 1 && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] font-mono text-amber-300 space-y-1">
                <span className="font-bold flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> 1-Time Secret Notice:
                </span>
                <p className="text-amber-300/80 leading-tight">
                  If you open and reveal this on your laptop, it will be deleted from the database and <strong>cannot be viewed on your phone</strong>! Scan with phone first, or select "2 Views" when creating.
                </p>
              </div>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                <Flame className="w-3 h-3 text-rose-400" />
                {maxViews === 1 ? '1-Time Burn on Read' : `${maxViews} Views allowed`}
              </span>
              {hasPassphrase && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <KeyRound className="w-3 h-3" />
                  Passphrase Protected
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                Expires in {Math.round((new Date(expiresAt) - new Date()) / 60000)}m
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Integrity & Database Verification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
          {/* Live DB Row Counter */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs font-mono font-medium text-slate-300">Database Row Status</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {rowCount > 0 ? '1 row currently stored in DB' : '0 rows — destroyed!'}
                </p>
              </div>
            </div>
            <button
              onClick={checkLiveDbRow}
              disabled={checkingRow}
              className={`p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition ${
                checkingRow ? 'animate-spin' : ''
              }`}
              title="Refresh DB Row Count"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tamper Simulation Button */}
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div>
                <p className="text-xs font-mono font-medium text-rose-300">Integrity Verification</p>
                <p className="text-[11px] text-rose-400/70 font-mono">
                  {tampered ? 'Ciphertext modified in DB' : 'Simulate 1-bit DB corruption'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTamperTest}
              disabled={tamperLoading || tampered}
              className={`px-2.5 py-1 text-xs font-mono rounded font-medium transition ${
                tampered
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
              }`}
            >
              {tamperLoading ? 'Testing...' : tampered ? 'Altered' : 'Test Tag'}
            </button>
          </div>
        </div>

        {/* Mobile Wi-Fi Diagnostic Tip */}
        <div className="mt-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-[11px] font-mono text-emerald-300/90 flex items-start gap-2">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-emerald-300">Mobile Connection Rule:</strong> Your phone must be connected to the same Wi-Fi network (or your phone's personal hotspot). If your phone is on cellular mobile data (4G/5G), switch it to Wi-Fi so it can reach <code className="bg-slate-900 px-1 py-0.5 rounded text-white">{lanIp}</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
