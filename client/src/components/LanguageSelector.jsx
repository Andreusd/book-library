import React from 'react';
import { useI18n } from '../i18n';
import { FlagUS, FlagBR, FlagES, FlagFR } from './FlagIcons';

const LANGUAGES = [
  { code: 'en', label: 'EN', title: 'English (US)', Flag: FlagUS },
  { code: 'pt', label: 'PT', title: 'Português (Brasil)', Flag: FlagBR },
  { code: 'es', label: 'ES', title: 'Español (España)', Flag: FlagES },
  { code: 'fr', label: 'FR', title: 'Français (France)', Flag: FlagFR },
];

export default function LanguageSelector({ className = '' }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={`flex items-center bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 text-xs shadow-sm ${className}`}>
      {LANGUAGES.map(({ code, label, title, Flag }) => {
        const isActive = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition font-medium cursor-pointer ${
              isActive
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
            }`}
            title={title}
            aria-label={title}
          >
            <Flag className="w-4 h-2.5 sm:w-4.5 sm:h-3" />
            <span className="font-semibold text-[11px] tracking-wide">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
