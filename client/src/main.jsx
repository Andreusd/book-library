import './pdfjs-init.js';
import { setupFetchInterceptor } from './api.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { I18nProvider } from './i18n';
import { SettingsProvider } from './contexts/SettingsContext.jsx';

setupFetchInterceptor();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </SettingsProvider>
  </StrictMode>,
);
