import React from 'react';
import { useI18n } from '../i18n';
import { Globe } from 'lucide-react';

export default function LanguageSelector() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
          lang === 'en' 
            ? 'bg-amber-500 text-neutral-950 shadow-sm' 
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        title="English (US)"
      >
        <span>EN</span>
      </button>

      <button
        onClick={() => setLang('pt')}
        className={`px-2 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
          lang === 'pt' 
            ? 'bg-amber-500 text-neutral-950 shadow-sm' 
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        title="Português (Brasil)"
      >
        <span>PT</span>
      </button>
    </div>
  );
}
