import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Sparkles, AlertCircle, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { CalculationInputs } from '../types';
import { analyzeJewelryImageClientSide, getStoredUserApiKey, saveUserApiKey } from '../lib/geminiClientService';

interface AiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: Partial<CalculationInputs>) => void;
}

export const AiScannerModal: React.FC<AiScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Key input state for GitHub Pages / static hosting
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getStoredUserApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не вдалося створити контекст обробки зображення'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Помилка завантаження зображення'));
      };
      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('Файл занадто великий. Будь ласка, оберіть фото до 20 МБ');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file);
      setSelectedImage(compressedDataUrl);
      setError(null);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setError(err?.message || 'Не вдалося обробити фото');
    }
  };

  const handleScan = async () => {
    if (!selectedImage) {
      setError('Будь ласка, завантажте фото бирки чи виробу');
      return;
    }

    setLoading(true);
    setError(null);

    let mappedInputs: Partial<CalculationInputs> | null = null;

    // 1. First attempt via Express server API
    try {
      const response = await fetch('/api/analyze-jewelry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          userNotes,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (json.success && json.data) {
            const data = json.data;
            mappedInputs = {
              title: data.title || 'Ювелірний виріб з фото',
              itemType: data.itemType || 'ring',
              metalType: (['gold', 'silver', 'platinum', 'palladium'].includes(data.metalType)
                ? data.metalType
                : 'gold') as any,
              purity: typeof data.purity === 'number' ? data.purity : 585,
              metalWeightGrams: typeof data.metalWeightGrams === 'number' ? data.metalWeightGrams : 4.0,
              retailPrice: typeof data.price === 'number' ? data.price : 0,
              brandName: data.brand || '',
              currency: (['UAH', 'USD', 'EUR'].includes(data.currency) ? data.currency : 'UAH') as any,
              notes: data.aiNotes || '',
              photoUrl: selectedImage,
            };

            if (Array.isArray(data.gemstones) && data.gemstones.length > 0) {
              mappedInputs.gemstones = data.gemstones.map((g: any, i: number) => ({
                id: 'scanned-gem-' + i + '-' + Date.now(),
                type: g.type?.toLowerCase().includes('діамант') ? 'diamond' : 'other',
                nameUk: g.type || 'Вставка',
                count: typeof g.count === 'number' ? g.count : 1,
                caratsPerStone: typeof g.carats === 'number' ? g.carats : 0.05,
                origin: g.origin || 'natural',
                clarityQuality: g.clarity || '',
                colorQuality: g.color || '',
              }));
            }
          }
        }
      }
    } catch (serverErr) {
      console.info('Server API unavailable, falling back to direct browser client scanning:', serverErr);
    }

    // 2. If server API returned 405 Method Not Allowed or failed (e.g. GitHub Pages static host), call client Gemini API
    if (!mappedInputs) {
      try {
        mappedInputs = await analyzeJewelryImageClientSide(
          selectedImage,
          userNotes,
          apiKeyInput
        );
      } catch (clientErr: any) {
        if (clientErr?.message === 'NO_API_KEY_GITHUB_PAGES') {
          setShowKeyPrompt(true);
          setError('Для AI розпізнавання введіть ваш безкоштовний API ключ Google у полі нижче.');
          setLoading(false);
          return;
        } else {
          console.error('Client scan error:', clientErr);
          setError(clientErr?.message || 'Помилка розпізнавання фото');
          setLoading(false);
          return;
        }
      }
    }

    if (mappedInputs) {
      onApplyData(mappedInputs);
      onClose();
    }
    setLoading(false);
  };

  const handleSaveKeyAndRetry = async () => {
    if (!apiKeyInput.trim()) {
      setError('Введіть Gemini API Key');
      return;
    }
    saveUserApiKey(apiKeyInput.trim());
    setShowKeyPrompt(false);
    setError(null);
    handleScan();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold font-serif text-white">
              AI Сканер Бирки / Чек / Прикраси
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Завантажте фото ювелірної бирки, виробу або товарного чека. Gemini AI розпізнає пробу, вагу, каміння та вартість і автоматично заповнить форму калькулятора.
          </p>

          {/* Upload Dropzone */}
          <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-5 text-center transition-colors bg-slate-950/50">
            {selectedImage ? (
              <div className="space-y-3">
                <img
                  src={selectedImage}
                  alt="Jewelry Tag Preview"
                  className="max-h-48 mx-auto rounded-lg border border-slate-700 object-contain"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-xs text-rose-400 hover:underline font-medium"
                >
                  Обрати інше фото
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 py-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  Завантажте фото бирки або зробіть знімок
                </div>
                <div className="text-[11px] text-slate-500">
                  Підтримуються JPG, PNG, WEBP до 20 МБ
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <label className="cursor-pointer flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Обрати з галереї</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium text-xs transition-colors">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Зробити фото камерою</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Уточнення для AI (опціонально)
            </label>
            <input
              type="text"
              placeholder="напр. Це каблучка 585 проби з золота, ціна на ценнику 15000 грн"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Clean API Key Selector / Input */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Налаштування AI сканування</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1"
              >
                Отримати API ключ Google
              </a>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  placeholder="Вставити власний Google Gemini API Key (за бажанням)"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    saveUserApiKey(e.target.value);
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {apiKeyInput.trim()
                  ? 'Використовується ваш персональний API ключ'
                  : 'За замовчуванням використовується вбудований сервіс AI розпізнавання'}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={handleScan}
            disabled={!selectedImage || loading}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Розпізнаю параметры...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>Запустити Розпізнавання</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
