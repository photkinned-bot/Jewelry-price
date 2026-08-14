import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { getStoredUserApiKey, saveUserApiKey } from '../lib/geminiClientService';
import { ModalDialog } from './ModalDialog';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredUserApiKey());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveUserApiKey(apiKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    saveUserApiKey('');
    setApiKey('');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 1200);
  };

  const hasKey = Boolean(apiKey.trim());

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Налаштування Gemini API Key"
      subtitle="Персональний ключ для автономної роботи без обмежень"
      icon={<Key className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          {hasKey ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Видалити ключ</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
            >
              Закрити
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
            >
              Зберегти
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-300">
          Для автономної роботи AI-сканера та генерації консультацій на static-хостингах (GitHub Pages, Vercel SPA) ви можете ввести ваш власний безкоштовний ключ Gemini API.
        </p>

        <div className="space-y-2">
          <label className="block font-semibold text-slate-200">
            Ваш Google Gemini API Key:
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1"
          >
            <span>Отримати безкоштовний ключ в Google AI Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-[11px] text-slate-400">
          <div className="flex items-center space-x-2 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Конфіденційність:</span>
          </div>
          <p>
            Ваш ключ зберігається виключно у локальній пам'яті вашого браузера (localStorage) та використовується тільки для прямих запитів до Google AI API.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ключ успішно збережено у вашому браузері!</span>
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
