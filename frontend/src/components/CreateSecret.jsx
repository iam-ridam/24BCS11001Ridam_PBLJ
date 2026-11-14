import React, { useState } from 'react';
import {
  Flame,
  KeyRound,
  Clock,
  Eye,
  EyeOff,
  Shield,
  FileCode,
  Upload,
  Lock,
  Sparkles,
  Layers,
  CheckCircle2,
  FileJson,
  Key,
} from 'lucide-react';
import { encryptSecret } from '../lib/crypto';
import { createSecretApi, getCreatorToken } from '../lib/api';

const SAMPLE_ENV = `# Production Database Configuration
DB_HOST=pg-cluster-prod-01.us-east-1.internal
DB_PORT=5432
DB_NAME=zeroburn_prod
DB_USERNAME=admin_user
DB_PASSWORD=vault_secure_password_example_123

# Cloud Vault Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=EXAMPLE_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=example_aws_secret_access_key_vault

# JWT Authentication Signing Key (HMAC-SHA256)
JWT_SECRET=secure_hmac_sha256_signing_key_example_zeroburn
JWT_EXPIRATION_SECONDS=86400

# Payment Gateway Secret Key
STRIPE_SECRET_KEY=example_mock_stripe_key_placeholder
`;

const SAMPLE_JSON = `{
  "project_id": "zeroburn-vault-prod",
  "client_email": "vault-admin@zeroburn.iam.gserviceaccount.com",
  "private_key_id": "7b8a9c0d1e2f3a4b",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nEXAMPLE_PRIVATE_KEY_BYTES_FOR_VAULT_TESTING\\n-----END PRIVATE KEY-----",
  "token_uri": "https://oauth2.googleapis.com/token"
}`;

const SAMPLE_API_KEYS = `# LLM & Cloud API Keys
OPENAI_API_KEY=example_mock_openai_api_key_placeholder
ANTHROPIC_API_KEY=example_mock_anthropic_api_key_placeholder
HUGGINGFACE_TOKEN=example_mock_huggingface_token_placeholder
GITHUB_TOKEN=example_mock_github_access_token_placeholder
`;

export default function CreateSecret({ onSecretCreated }) {
  const [content, setContent] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const [maxViews, setMaxViews] = useState(2); // Default to 2 for testing Laptop + Phone simultaneously!
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getPassphraseStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-700', text: 'text-slate-500' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-cyan-500', text: 'text-cyan-400' };
    return { score: 4, label: 'Vault Grade', color: 'bg-emerald-500', text: 'text-emerald-400' };
  };

  const strength = getPassphraseStrength(passphrase);
  const lineCount = content ? content.split('\n').length : 0;
  const byteCount = new TextEncoder().encode(content).length;

  const handleLoadSample = (sampleText) => {
    setContent(sampleText);
    setErrorMessage('');
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target.result);
      setErrorMessage('');
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read uploaded file');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Please enter or paste secret content first.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Client-Side Zero-Knowledge Encryption (WebCrypto or Noble fallback)
      const pass = hasPassphrase ? passphrase.trim() : '';
      const { ciphertext, iv, salt, urlFragment } = await encryptSecret(content, pass);

      // 2. Creator anonymous token for SSE alerts
      const creatorToken = getCreatorToken();

      // 3. Send ONLY ciphertext, iv, salt to backend. Key is never transmitted!
      const result = await createSecretApi({
        ciphertext,
        iv,
        salt,
        hasPassphrase: Boolean(pass),
        maxViews: Number(maxViews),
        expiryMinutes: Number(expiryMinutes),
        creatorToken,
      });

      // 4. Notify parent with secretId and the client-only urlFragment
      onSecretCreated({
        secretId: result.secretId,
        urlFragment,
        expiresAt: result.expiresAt,
        maxViews: result.maxViews,
        hasPassphrase: result.hasPassphrase,
      });

      // Reset form
      setContent('');
      setPassphrase('');
      setHasPassphrase(false);
    } catch (err) {
      console.error('Encryption / Creation error:', err);
      setErrorMessage(err.message || 'Failed to encrypt and store secret.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro hero card */}
      <div className="relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame className="w-48 h-48 text-rose-500" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Knowledge Client-Side AES-256-GCM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              Self-Destructing Secret &amp; <span className="text-emerald-400">.env</span> Sharer
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Encrypt sensitive environment variables and credentials in your browser before they touch the server.
              Single-view secrets are deleted atomically with real-time intrusion alerts if accessed again.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">Presets:</span>
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_ENV)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/40 transition font-mono whitespace-nowrap shadow-sm group"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>.env File</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_API_KEYS)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/40 transition font-mono whitespace-nowrap shadow-sm group"
            >
              <Key className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>API Keys</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_JSON)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-950/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/40 transition font-mono whitespace-nowrap shadow-sm group"
            >
              <FileJson className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>JSON Auth</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Secret Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border transition-all ${
            dragOver
              ? 'border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
              : 'border-slate-800 bg-slate-900/60'
          }`}
        >
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-slate-300">
                Secret Payload / .env Content
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 rounded border border-slate-700 cursor-pointer transition font-mono">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .env</span>
                <input
                  type="file"
                  accept=".env,.txt,.json,.conf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </label>
              {content && (
                <button
                  type="button"
                  onClick={() => setContent('')}
                  className="text-[11px] font-mono text-slate-500 hover:text-rose-400 px-2 py-1 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div className="p-4 relative">
            <textarea
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="PASTE SENSITIVE CREDENTIALS HERE (API Keys, Database Passwords, .env file, SSH Keys)..."
              className="w-full bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed p-4 rounded-xl border border-slate-800/80 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none placeholder:text-slate-600 resize-y"
            />
            {dragOver && (
              <div className="absolute inset-0 bg-emerald-950/80 rounded-xl flex items-center justify-center pointer-events-none backdrop-blur-xs">
                <p className="text-emerald-300 font-mono font-semibold text-sm flex items-center gap-2">
                  <Upload className="w-5 h-5 animate-bounce" /> Drop .env file to load
                </p>
              </div>
            )}
          </div>

          {/* Metrics bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 rounded-b-2xl text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span>Lines: <strong className="text-slate-300">{lineCount}</strong></span>
              <span>Characters: <strong className="text-slate-300">{content.length}</strong></span>
              <span>Payload: <strong className="text-slate-300">{byteCount} bytes</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AES-256-GCM In-Memory Key</span>
            </div>
          </div>
        </div>

        {/* Security & Lifecycle Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Max Views Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Flame className="w-4 h-4 text-rose-400" />
              <label className="text-xs font-mono font-semibold">Self-Destruction (Views)</label>
            </div>
            <select
              value={maxViews}
              onChange={(e) => setMaxViews(Number(e.target.value))}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value={1}>1-Time View (Strict Self-Destruction on First Read)</option>
              <option value={2}>2 Views allowed (Multi-Device Access)</option>
              <option value={3}>3 Views allowed</option>
              <option value={5}>5 Views allowed</option>
              <option value={10}>10 Views allowed</option>
            </select>
            <p className="text-[11px] text-slate-500 font-mono">
              {maxViews === 1
                ? 'Single-view secret is permanently destroyed from database immediately upon first reveal.'
                : `Allows up to ${maxViews} authorized reveals before automatic row deletion.`}
            </p>
          </div>

          {/* Expiration Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <label className="text-xs font-mono font-semibold">Expiration Timer</label>
            </div>
            <select
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(Number(e.target.value))}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value={5}>5 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={1440}>24 Hours</option>
              <option value={10080}>7 Days</option>
            </select>
            <p className="text-[11px] text-slate-500 font-mono">
              Auto-purged by Spring Boot @Scheduled cleanup daemon if not viewed.
            </p>
          </div>

          {/* Passphrase Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <label className="text-xs font-mono font-semibold">Optional Passphrase</label>
              </div>
              <input
                type="checkbox"
                id="togglePassphrase"
                checked={hasPassphrase}
                onChange={(e) => {
                  setHasPassphrase(e.target.checked);
                  if (!e.target.checked) setPassphrase('');
                }}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </div>

            {hasPassphrase ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter custom passphrase..."
                    className="w-full text-xs font-mono bg-slate-950 border border-cyan-500/50 rounded-lg px-3 py-2 text-cyan-200 pr-10 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-cyan-300 transition"
                  >
                    {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Strength Meter */}
                {passphrase && (
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                    <span className="text-slate-500">Entropy Strength:</span>
                    <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-mono py-2">
                URL fragment contains full key. Enable passphrase for two-factor isolation.
              </div>
            )}
            <p className="text-[11px] text-slate-500 font-mono">
              PBKDF2 (100,000 iterations, SHA-256, 16-byte random salt).
            </p>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Anti-Link-Preview Protected (Two-Step Reveal Safe)</span>
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-mono text-sm font-bold transition shadow-xl ${
              loading || !content.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20 active:scale-98'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Encrypting in Browser...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Encrypt &amp; Generate Burn Link</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
