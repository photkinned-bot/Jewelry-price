import React, { useState, useEffect } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Key,
  Clipboard,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { CalculationInputs } from '../types';
import { analyzeJewelryImageClientSide, getStoredUserApiKey, saveUserApiKey } from '../lib/geminiClientService';
import { ModalDialog } from './ModalDialog';

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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [pasteSuccess, setPasteSuccess] = useState<boolean>(false);

  // Key input state for GitHub Pages / static hosting
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKeyPrompt, setShowKeyPrompt] = useState<boolean>(false);

  const MAX_IMAGES = 6;

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getStoredUserApiKey());
      setError(null);
    }
  }, [isOpen]);

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

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setError('Будь ласка, оберіть файли зображень (JPG, PNG, WEBP)');
      return;
    }

    const availableSlots = MAX_IMAGES - selectedImages.length;
    if (availableSlots <= 0) {
      setError(`Максимально дозволено додати до ${MAX_IMAGES} фотографій`);
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots);
    if (fileArray.length > availableSlots) {
      setError(`Додано перші ${availableSlots} фото (ліміт: ${MAX_IMAGES})`);
    } else {
      setError(null);
    }

    try {
      const compressedResults = await Promise.all(
        filesToProcess.map((f) => compressImage(f))
      );
      setSelectedImages((prev) => [...prev, ...compressedResults]);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setError(err?.message || 'Не вдалося обробити одне або декілька фото');
    }
  };

  // Support direct clipboard paste (Ctrl+V or context menu paste)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = async (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isTextInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await processFiles(imageFiles);
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
        return;
      }

      // If user pasted base64 data URL while not focused on input
      if (!isTextInput) {
        const pastedText = e.clipboardData?.getData('text');
        if (pastedText && pastedText.startsWith('data:image/')) {
          e.preventDefault();
          if (selectedImages.length < MAX_IMAGES) {
            setSelectedImages((prev) => [...prev, pastedText]);
            setError(null);
            setPasteSuccess(true);
            setTimeout(() => setPasteSuccess(false), 2000);
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen, selectedImages.length]);

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        setError('Буфер обміну не підтримується браузером. Натисніть Ctrl+V для вставки.');
        return;
      }

      // 1. Try navigator.clipboard.read() for images
      if (navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          const imageFiles: File[] = [];
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              imageFiles.push(new File([blob], `clipboard-${Date.now()}.png`, { type: imageType }));
            }
          }
          if (imageFiles.length > 0) {
            await processFiles(imageFiles);
            setPasteSuccess(true);
            setTimeout(() => setPasteSuccess(false), 2000);
            return;
          }
        } catch (readErr) {
          console.info('Clipboard read permission prompt or format fallback:', readErr);
        }
      }

      // 2. Fallback to readText
      if (navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('data:image/') || text.startsWith('http://') || text.startsWith('https://'))) {
          if (selectedImages.length < MAX_IMAGES) {
            setSelectedImages((prev) => [...prev, text]);
            setError(null);
            setPasteSuccess(true);
            setTimeout(() => setPasteSuccess(false), 2000);
          }
          return;
        } else if (text && text.trim()) {
          // If text or numeric values copied, append to user notes
          setUserNotes((prev) => (prev ? `${prev}, ${text.trim()}` : text.trim()));
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
          return;
        }
      }

      setError('У буфері обміну немає скопійованого зображення. Скопіюйте фото чи скріншот бирки та спробуйте ще раз (або натисніть Ctrl+V).');
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setError('Не вдалося прочитати буфер обміну. Дозвольте доступ до буфера у браузері або натисніть Ctrl+V.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    e.target.value = ''; // Reset input to allow re-uploading the same file if needed
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllImages = () => {
    setSelectedImages([]);
  };

  const handleScan = async () => {
    if (selectedImages.length === 0) {
      setError('Будь ласка, завантажте хоча б одне фото бирки чи виробу');
      return;
    }

    setLoading(true);
    setError(null);

    let mappedInputs: Partial<CalculationInputs> | null = null;

    // 1. First attempt via Express server API (sends all images)
    try {
      const response = await fetch('/api/analyze-jewelry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imagesBase64: selectedImages,
          imageBase64: selectedImages[0], // fallback for backward compatibility
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
              photoUrl: selectedImages[0],
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

    // 2. If server API returned error or failed (e.g. GitHub Pages static host), call client Gemini API
    if (!mappedInputs) {
      try {
        mappedInputs = await analyzeJewelryImageClientSide(
          selectedImages,
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
      if (!mappedInputs.photoUrl && selectedImages.length > 0) {
        mappedInputs.photoUrl = selectedImages[0];
      }
      onApplyData(mappedInputs);
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="AI Мульти-сканер Бирки / Чека / Прикраси"
      subtitle="Завантажте декілька фото: лицьову та зворотну сторону бирки, виріб і пробу"
      icon={<Sparkles className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleScan}
            disabled={selectedImages.length === 0 || loading}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Аналізую {selectedImages.length} {selectedImages.length === 1 ? 'фото' : 'фотографій'}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>
                  Запустити Розпізнавання {selectedImages.length > 0 ? `(${selectedImages.length})` : ''}
                </span>
              </>
            )}
          </button>
        </>
      }
    >
      <div
        className="space-y-4"
        onContextMenu={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-slate-300">
          <Layers className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Ви можете обрати <strong>одночасно декілька зображень</strong> (наприклад: лицьовий бік бирки з ціною, зворотний з характеристиками каміння, макро-фото виробу або чек). AI зіставить всі фото в єдину оцінку.
          </p>
        </div>

        {/* Selected Images Grid & Actions */}
        {selectedImages.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Вибрані зображення ({selectedImages.length} з {MAX_IMAGES})</span>
              </span>
              <button
                type="button"
                onClick={handleClearAllImages}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистити всі</span>
              </button>
            </div>

            {/* Grid of uploaded images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {selectedImages.map((imgUrl, index) => (
                <div
                  key={index}
                  className="group relative rounded-xl border border-slate-700 bg-slate-950/70 overflow-hidden shadow-md aspect-square flex items-center justify-center p-1.5 hover:border-amber-400/60 transition-all"
                >
                  <img
                    src={imgUrl}
                    alt={`Завантажене фото #${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {/* Badge */}
                  <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-300 shadow">
                    {index === 0 ? '★ Головне #1' : `#${index + 1}`}
                  </div>
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-rose-300 flex items-center justify-center transition-all cursor-pointer shadow active:scale-90"
                    title="Видалити це фото"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add more button tile (if less than MAX_IMAGES) */}
              {selectedImages.length < MAX_IMAGES && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl aspect-square flex flex-col items-center justify-center p-2 text-center transition-all ${
                    isDragOver ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-300 mb-2">
                    + Додати ще одне фото
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <label className="cursor-pointer px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1">
                      <Upload className="w-3 h-3 text-sky-400" />
                      <span>Галерея</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <label className="cursor-pointer px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1">
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>Камера</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="cursor-pointer px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                      title="Вставити з буферу (Ctrl+V)"
                    >
                      <Clipboard className="w-3 h-3 text-amber-400" />
                      <span>Буфер</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State Dropzone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-colors bg-slate-950/50 ${
              isDragOver ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 hover:border-amber-400/70'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2.5 py-2">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 shadow-inner">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-200">
                Виберіть одне або декілька фото бирки, виробу чи чека
              </div>
              <div className="text-[11px] text-slate-500 max-w-sm">
                Можна вибрати декілька фото одночасно з галереї, зробити кілька знімків поспіль або натиснути <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px]">Ctrl+V</kbd>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {/* Gallery Multiple File Select */}
                <label className="cursor-pointer flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs transition-colors shadow-sm active:scale-95">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Вибрати фото (можна декілька)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Camera Capture */}
                <label className="cursor-pointer flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-colors active:scale-95">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Зняти на камеру</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Paste from Clipboard Button */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="cursor-pointer flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all active:scale-95 shadow-sm"
                  title="Вставити скопійований скріншот або фото з буфера обміну (Ctrl+V)"
                >
                  <Clipboard className="w-4 h-4 text-amber-400" />
                  <span>Вставити з буферу</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paste success confirmation */}
        {pasteSuccess && (
          <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Зображення успішно додано з буферу обміну!</span>
          </div>
        )}

        {/* Optional notes input with full right-click context menu protection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Уточнення для AI (опціонально: коментар, вага, тип каміння чи ціна)
          </label>
          <input
            type="text"
            placeholder="напр. Це каблучка 585 проби з золота, вага 4.2г, ціна 15000 грн"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            onContextMenu={(e) => e.stopPropagation()}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Clean API Key Selector / Input */}
        <div
          className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs"
          onContextMenu={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Налаштування AI</span>
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline"
            >
              Отримати API ключ
            </a>
          </div>

          <div className="space-y-1.5">
            <input
              type="password"
              placeholder="Власний Google Gemini API Key (за бажанням)"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                saveUserApiKey(e.target.value);
              }}
              onContextMenu={(e) => e.stopPropagation()}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
            />
            <p className="text-[10px] text-slate-400">
              {apiKeyInput.trim()
                ? 'Використовується персональний API ключ'
                : 'Використовується вбудований сервіс AI розпізнавання'}
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
    </ModalDialog>
  );
};
