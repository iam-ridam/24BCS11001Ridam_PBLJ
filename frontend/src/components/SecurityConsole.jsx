import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Wifi,
  Database,
  Flame,
  AlertTriangle,
  RefreshCw,
  Clock,
  Terminal,
  Activity,
  UserCheck,
  Eye,
  KeyRound,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import {
  getActiveSecretsApi,
  getAlertHistoryApi,
  getCreatorToken,
  getLiveRowCountApi,
  simulateTamperApi,
} from '../lib/api';

export default function SecurityConsole({ alerts, isConnected, onSelectSecret }) {
  const [activeSecrets, setActiveSecrets] = useState([]);
  const [loadingSecrets, setLoadingSecrets] = useState(false);
  const [liveRowCounts, setLiveRowCounts] = useState({});
  const [tamperingId, setTamperingId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedPsql, setCopiedPsql] = useState(false);
  const prevAlertCount = useRef(alerts.length);

  const creatorToken = getCreatorToken();

  // Play synthesized intrusion alarm sound
  const playIntrusionSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3); // Drop to A4

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 75, 150]);
      }
    } catch (e) {
      // Audio playback might be restricted until user interacts with the page
    }
  };

  // Trigger sound when new intrusion alert arrives
  useEffect(() => {
    if (alerts.length > prevAlertCount.current) {
      const latest = alerts[0];
      if (latest && latest.eventType === 'INTRUSION_ATTEMPT') {
        playIntrusionSound();
      }
    }
    prevAlertCount.current = alerts.length;
  }, [alerts]);

  const fetchActiveSecrets = async () => {
    setLoadingSecrets(true);
    try {
      const data = await getActiveSecretsApi(creatorToken);
      setActiveSecrets(data);
    } catch (err) {
      console.warn('Failed to load active secrets:', err);
    } finally {
      setLoadingSecrets(false);
    }
  };

  useEffect(() => {
    fetchActiveSecrets();
  }, [alerts]); // Refresh whenever an alert arrives

  // Check row count for a secret
  const checkRowCount = async (secretId) => {
    try {
      const data = await getLiveRowCountApi(secretId);
      setLiveRowCounts((prev) => ({ ...prev, [secretId]: data.rowCount }));
    } catch (err) {
      console.warn('Failed to check row count:', err);
    }
  };

  // Integrity test simulation trigger
  const handleTamper = async (secretId) => {
    if (!confirm('Flip 1 character of ciphertext in PostgreSQL database to simulate tampering?')) {
      return;
    }
    setTamperingId(secretId);
    try {
      await simulateTamperApi(secretId);
      alert('Ciphertext modified in database. AES-256-GCM authentication tag verification will now reject decryption.');
      fetchActiveSecrets();
    } catch (err) {
      alert('Tamper simulation failed: ' + err.message);
    } finally {
      setTamperingId(null);
    }
  };

  // Find recent intrusion attempts
  const intrusionAlerts = alerts.filter((a) => a.eventType === 'INTRUSION_ATTEMPT');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Stream Status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono text-white">Live Creator Security Console</h2>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {isConnected ? 'SSE STREAM ACTIVE' : 'RECONNECTING...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Laptop A Host Console • Monitoring real-time reads, burns &amp; intrusion events
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
              soundEnabled
                ? 'bg-purple-950/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/40'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            title="Audio alert when intrusion is detected"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Alarm: ON' : 'Alarm: OFF'}</span>
          </button>

          <button
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(alerts, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', `zeroburn-audit-log-${Date.now()}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            disabled={alerts.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 disabled:opacity-40"
            title="Export audit trail as JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Logs</span>
          </button>

          <button
            onClick={fetchActiveSecrets}
            disabled={loadingSecrets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSecrets ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Intrusion Alert Banner */}
      {intrusionAlerts.length > 0 && (
        <div className="rounded-2xl border border-rose-500 bg-rose-950/40 p-5 shadow-2xl animate-flash-danger space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <h3 className="text-base font-extrabold font-mono tracking-wide">
                UNAUTHORIZED ACCESS ATTEMPT BLOCKED ({intrusionAlerts.length})
              </h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white animate-pulse">
              LIVE INTRUSION
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {intrusionAlerts.slice(0, 4).map((alert, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/90 border border-rose-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-rose-300 font-bold">
                  <span>Secret: {alert.secretId ? alert.secretId.slice(0, 8) + '...' : 'Unknown'}</span>
                  <span className="text-slate-400 text-[10px]">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] space-y-0.5">
                  <p>
                    <span className="text-slate-500">Requester IP:</span>{' '}
                    <span className="text-amber-300 font-semibold">{alert.ipAddress}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Device/Client:</span>{' '}
                    <span className="text-emerald-300 font-semibold">{alert.deviceInfo}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Status:</span>{' '}
                    <span className="text-rose-400 font-bold">REJECTED (0 rows in PostgreSQL)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dual Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Secrets Column (1/3) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Active Secrets in DB ({activeSecrets.length})</span>
            </h3>
          </div>

          {activeSecrets.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-2">
              <Database className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs font-mono text-slate-500">No active unconsumed secrets.</p>
              <p className="text-[11px] font-mono text-slate-600">
                Created secrets will appear here until burned or expired.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSecrets.map((s) => {
                const count = liveRowCounts[s.secretId];
                return (
                  <div
                    key={s.secretId}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {s.secretId.slice(0, 8)}...
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {s.remainingViews} / {s.maxViews} views left
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Expires in:</span>
                        <span className="text-amber-300">
                          {Math.floor(s.remainingSeconds / 60)}m {s.remainingSeconds % 60}s
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>DB Row Count:</span>
                        <span className={count === 0 ? 'text-rose-400 font-bold' : 'text-cyan-300'}>
                          {count !== undefined ? `${count} row(s)` : '1 in DB'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => checkRowCount(s.secretId)}
                        className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition"
                        title="Query PostgreSQL countById"
                      >
                        Check DB
                      </button>
                      <button
                        onClick={() => handleTamper(s.secretId)}
                        disabled={tamperingId === s.secretId}
                        className="py-1 px-2 rounded bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800 text-[11px] font-mono transition"
                        title="Integrity Verification: Modify 1 character in PostgreSQL to test AES-GCM tag validation"
                      >
                        Tamper
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Real-time Audit & Intrusion Feed (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Audit Event Stream</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Live SSE Feed</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 max-h-[500px] overflow-y-auto space-y-2 font-mono text-xs shadow-inner">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-600 space-y-2">
                <Activity className="w-6 h-6 mx-auto animate-pulse text-slate-700" />
                <p>Waiting for events... (Create a secret or scan the QR code)</p>
              </div>
            ) : (
              alerts.map((item, idx) => {
                const isIntrusion = item.eventType === 'INTRUSION_ATTEMPT';
                const isConsumed = item.eventType === 'CONSUMED';
                const isCreated = item.eventType === 'CREATED';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isIntrusion
                        ? 'bg-rose-950/40 border-rose-700 text-rose-200 animate-flash-danger'
                        : isConsumed
                        ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                        : isCreated
                        ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            isIntrusion
                              ? 'bg-rose-600 text-white'
                              : isConsumed
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isCreated
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.eventType}
                        </span>
                        {item.secretId && (
                          <span className="text-slate-500 text-[11px]">
                            id: {item.secretId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-200">{item.message}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span>
                        IP: <strong className="text-slate-300">{item.ipAddress || '127.0.0.1'}</strong>
                      </span>
                      <span>
                        Device: <strong className="text-slate-300">{item.deviceInfo || 'Unknown'}</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Database Verification Box: Direct Row Inspection */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 text-xs font-mono space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Terminal className="w-4 h-4" />
            <span>Database Row Deletion Verification (PostgreSQL)</span>
          </div>
          <button
            onClick={() => {
              const cmd = `/usr/lib/postgresql/18/bin/psql -h 127.0.0.1 -p 5433 -U postgres -d zeroburn -c "SELECT id, remaining_views, expires_at FROM secrets;"`;
              navigator.clipboard.writeText(cmd);
              setCopiedPsql(true);
              setTimeout(() => setCopiedPsql(false), 2000);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
          >
            {copiedPsql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPsql ? 'Copied Command!' : 'Copy psql command'}</span>
          </button>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Execute directly against PostgreSQL to verify that consumed secrets are permanently deleted to <strong className="text-rose-400">(0 rows)</strong> with zero plaintext remnant.
        </p>
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto select-all">
          /usr/lib/postgresql/18/bin/psql -h 127.0.0.1 -p 5433 -U postgres -d zeroburn -c "SELECT id, remaining_views, expires_at FROM secrets;"
        </div>
      </div>
    </div>
  );
}
