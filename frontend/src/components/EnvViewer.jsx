import React, { useState } from 'react';
import { Copy, Check, FileCode, Eye, EyeOff } from 'lucide-react';

export default function EnvViewer({ content, title = 'Decrypted Payload (.env)' }) {
  const [copied, setCopied] = useState(false);
  const [copiedLine, setCopiedLine] = useState(null);
  const [showValues, setShowValues] = useState(true);

  const lines = content.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLine = (val, idx) => {
    navigator.clipboard.writeText(val);
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 1500);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">{title}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            {lines.length} lines • {content.length} bytes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowValues(!showValues)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 rounded border border-slate-700/60 transition"
            title={showValues ? 'Mask Values' : 'Reveal Values'}
          >
            {showValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono">{showValues ? 'Mask' : 'Show'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition font-mono"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code body with line numbers */}
      <div className="p-4 overflow-x-auto max-h-[380px] font-mono text-xs leading-relaxed select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => {
              const trimmed = line.trim();
              const isComment = trimmed.startsWith('#');
              const eqIdx = line.indexOf('=');

              let keyPart = line;
              let valPart = '';
              let hasEqual = false;

              if (!isComment && eqIdx > 0) {
                keyPart = line.substring(0, eqIdx);
                valPart = line.substring(eqIdx + 1);
                hasEqual = true;
              }

              return (
                <tr key={index} className="hover:bg-slate-900/40 group">
                  <td className="w-10 text-right pr-4 text-slate-600 select-none text-[11px] py-0.5 border-r border-slate-900">
                    {index + 1}
                  </td>
                  <td className="pl-4 py-0.5 whitespace-pre flex-1">
                    {isComment ? (
                      <span className="text-slate-500 italic">{line}</span>
                    ) : hasEqual ? (
                      <>
                        <span className="text-cyan-400 font-semibold">{keyPart}</span>
                        <span className="text-slate-500 font-bold">=</span>
                        {showValues ? (
                          <span className="text-amber-300">{valPart}</span>
                        ) : (
                          <span className="text-slate-600 tracking-widest select-none">
                            ••••••••••••••••••••
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-300">{line}</span>
                    )}
                  </td>
                  <td className="w-12 text-right pr-2 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isComment && trimmed && (
                      <button
                        onClick={() => handleCopyLine(hasEqual ? valPart : line, index)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition"
                        title={hasEqual ? 'Copy value' : 'Copy line'}
                      >
                        {copiedLine === index ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
