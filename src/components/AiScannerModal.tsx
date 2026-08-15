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
  Link2,
  Globe,
  Layers,
  Image as ImageIcon,
  Gem,
  Scale,
  Tag,
  Store,
  Check
} from 'lucide-react';
import { CalculationInputs } from '../types';
import { analyzeJewelryUnified, getStoredUserApiKey, saveUserApiKey } from '../lib/geminiClientService';
import { isValidWebUrl, normalizeUrl } from '../lib/productImageService';
import { calculateGemstoneUsdValue } from '../data/gemstoneValuation';
import { ModalDialog } from './ModalDialog';

interface AiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: Partial<CalculationInputs>) => void;
}

type ScannerMode = 'url' | 'photo';

// Helpful sample store links for 1-click test
const SAMPLE_STORE_URLS = [
  {
    name: 'Золотий Вік (Каблучка 585)',
    url: 'https://zolotiyvik.ua/ua/kolco-iz-krasnogo-zolota-s-fianitami-art-110291410101.html',
    desc: 'Золото 585, фіаніти, родіювання',
  },
  {
    name: 'SOVA (Сережки з діамантом)',
    url: 'https://sovajewelry.com/ua/sergi-iz-belogo-zolota-s-brilliantom-art-020358510201/',
    desc: 'Біле золото 585, натуральний діамант',
  },
  {
    name: 'Укрзолото (Ланцюжок 585)',
    url: 'https://ukrzoloto.ua/uk/tsepochka-iz-krasnogo-zolota-pletenie-mona-liza-art-060410.html',
    desc: 'Золото 585, плетіння Мона Ліза',
  },
  {
    name: 'Zarina (Підвіска з топазом)',
    url: 'https://zarina.ua/ua/pidviska-z-zolota-z-topazom-ta-fianitamy-art-71089201.html',
    desc: 'Золото 585, блакитний топаз, фіаніти',
  },
];

export const AiScannerModal: React.FC<AiScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const [mode, setMode] = useState<ScannerMode>('url');
  const [productUrl, setProductUrl] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [userNotes, setUserNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [pasteSuccess, setPasteSuccess] = useState<boolean>(false);

  // Scanned result preview before applying
  const [scannedResult, setScannedResult] = useState<Partial<CalculationInputs> | null>(null);

  // Key input state for GitHub Pages / static hosting
  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const MAX_IMAGES = 6;

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getStoredUserApiKey());
      setError(null);
      setScannedResult(null);
      setLoading(false);
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
      setMode('photo');
    } catch (err: any) {
      console.error('Image compression error:', err);
      setError(err?.message || 'Не вдалося обробити одне або декілька фото');
    }
  };

  // Support direct clipboard paste (URL or Image)
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

      if (!isTextInput) {
        const pastedText = e.clipboardData?.getData('text');
        if (pastedText && isValidWebUrl(pastedText)) {
          e.preventDefault();
          setProductUrl(pastedText.trim());
          setMode('url');
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
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
        setError('Буфер обміну не підтримується браузером. Натисніть Ctrl+V.');
        return;
      }

      if (navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && isValidWebUrl(text)) {
          setProductUrl(text.trim());
          setMode('url');
          setPasteSuccess(true);
          setError(null);
          setTimeout(() => setPasteSuccess(false), 2000);
          return;
        } else if (text && (text.startsWith('data:image/') || text.startsWith('http'))) {
          if (selectedImages.length < MAX_IMAGES) {
            setSelectedImages((prev) => [...prev, text]);
            setMode('photo');
            setError(null);
            setPasteSuccess(true);
            setTimeout(() => setPasteSuccess(false), 2000);
          }
          return;
        } else if (text && text.trim()) {
          setUserNotes((prev) => (prev ? `${prev}, ${text.trim()}` : text.trim()));
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
          return;
        }
      }

      if (navigator.clipboard.read) {
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
      }

      setError('У буфері обміну немає посилання на товар чи зображення. Скопіюйте URL або скріншот та натисніть Ctrl+V.');
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setError('Дозвольте доступ до буфера обміну або скористайтесь комбінацією клавіш Ctrl+V.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    e.target.value = '';
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
    const hasUrl = mode === 'url' && productUrl.trim().length > 0;
    const hasImages = selectedImages.length > 0;

    if (!hasUrl && !hasImages) {
      setError(
        mode === 'url'
          ? 'Будь ласка, вставте посилання на товар в інтернет-магазині (наприклад https://zolotiyvik.ua/...)'
          : 'Будь ласка, завантажте хоча б одне фото бирки чи виробу'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setScannedResult(null);

    if (hasUrl) {
      setLoadingStep('Завантаження сторінки магазину та витягування характеристик...');
    } else {
      setLoadingStep(`Аналіз ${selectedImages.length} фото біржі/виробу...`);
    }

    try {
      const normalized = hasUrl ? normalizeUrl(productUrl) : undefined;
      const resultData = await analyzeJewelryUnified({
        url: normalized,
        images: selectedImages,
        userNotes,
        apiKeyOverride: apiKeyInput,
      });

      if (!resultData || Object.keys(resultData).length === 0) {
        throw new Error('AI не зміг розпізнати параметри ювелірного виробу. Перевірте посилання або спробуйте інше фото.');
      }

      setScannedResult(resultData);
      setLoading(false);
    } catch (err: any) {
      console.error('Scan error:', err);
      if (err?.message === 'NO_API_KEY_GITHUB_PAGES') {
        setError('Для роботи AI сканера потрібен безкоштовний Google Gemini API Key. Введіть його у формі налаштувань нижче.');
      } else {
        setError(err?.message || 'Помилка аналізу. Перевірте доступність сайту чи правильність посилання.');
      }
      setLoading(false);
    }
  };

  const handleApplyAndClose = () => {
    if (scannedResult) {
      onApplyData(scannedResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="AI Сканер Ювелірних Прикрас"
      subtitle="Витягує пробу, вагу, ціну, вставки та фото за посиланням на магазин або з фото бирки"
      icon={<Sparkles className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            Скасувати
          </button>

          {scannedResult ? (
            <button
              type="button"
              onClick={handleApplyAndClose}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-slate-950" />
              <span>Застосувати у калькулятор</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleScan}
              disabled={loading || (mode === 'url' && !productUrl.trim() && selectedImages.length === 0)}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Розпізнаю...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>Запустити AI Сканер</span>
                </>
              )}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4" onContextMenu={(e) => e.stopPropagation()}>
        
        {/* Mode Selector Tabs */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('url');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'url'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Посилання на магазин</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/20 font-normal">Нове</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('photo');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'photo'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Фото біржі / виробу</span>
            {selectedImages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 font-bold">
                {selectedImages.length}
              </span>
            )}
          </button>
        </div>

        {/* 1. URL SCANNER VIEW */}
        {mode === 'url' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Посилання на сторінку товару</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Золотий Вік, SOVA, Укрзолото, Zarina, Pandora, Rozetka тощо)
                </span>
              </label>

              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-500 pointer-events-none">
                  <Link2 className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  placeholder="https://zolotiyvik.ua/ua/kolco-iz-zolota..."
                  value={productUrl}
                  onChange={(e) => {
                    setProductUrl(e.target.value);
                    setScannedResult(null);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && productUrl.trim() && !loading) {
                      e.preventDefault();
                      handleScan();
                    }
                  }}
                  onContextMenu={(e) => e.stopPropagation()}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-24 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner font-mono"
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="absolute right-2 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  title="Вставити посилання з буфера (Ctrl+V)"
                >
                  <Clipboard className="w-3 h-3 text-amber-400" />
                  <span>Вставити</span>
                </button>
              </div>
            </div>

            {/* Quick Test Samples */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Або оберіть приклад для миттєвого тестування:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SAMPLE_STORE_URLS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setProductUrl(sample.url);
                      setScannedResult(null);
                      setError(null);
                    }}
                    className={`text-left p-2 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
                      productUrl === sample.url
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="font-semibold text-[11px] text-white flex items-center gap-1">
                      <Store className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{sample.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">{sample.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. PHOTO MULTI-SCANNER VIEW */}
        {mode === 'photo' && (
          <div className="space-y-3">
            {selectedImages.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Завантажені фото ({selectedImages.length} з {MAX_IMAGES})</span>
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {selectedImages.map((imgUrl, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl border border-slate-700 bg-slate-950/70 overflow-hidden shadow-md aspect-square flex items-center justify-center p-1.5 hover:border-amber-400/60 transition-all"
                    >
                      <img
                        src={imgUrl}
                        alt={`Фото #${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-300 shadow">
                        {index === 0 ? '★ Головне #1' : `#${index + 1}`}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-rose-300 flex items-center justify-center transition-all cursor-pointer shadow active:scale-90"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

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
                        + Додати фото
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <label className="cursor-pointer px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1">
                          <Upload className="w-3 h-3 text-sky-400" />
                          <span>Файл</span>
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
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
                    Завантажте фото бирки з обох боків, чека або самого виробу
                  </div>
                  <div className="text-[11px] text-slate-500 max-w-sm">
                    AI автоматично зіставить дані з кількох фотографій (пробу, вагу, каміння та вартість)
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <label className="cursor-pointer flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs transition-colors shadow-sm active:scale-95">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Вибрати з галереї</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

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

                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="cursor-pointer flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all active:scale-95 shadow-sm"
                      title="Вставити скопійоване фото (Ctrl+V)"
                    >
                      <Clipboard className="w-4 h-4 text-amber-400" />
                      <span>Вставити з буферу</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading Progress State */}
        {loading && (
          <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl space-y-2 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-semibold text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{loadingStep || 'AI обробляє інформацію...'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Витягуємо пробу металу, вагу, характеристики вставок каміння, ціну та фото товару.
            </p>
          </div>
        )}

        {/* Scanned Result Preview Card */}
        {scannedResult && !loading && (
          <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 border border-amber-500/40 rounded-2xl space-y-3 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-emerald-300">
                  Параметри успішно розпізнано!
                </span>
              </div>
              <button
                type="button"
                onClick={handleScan}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
              >
                Сканувати заново
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {scannedResult.photoUrl && (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shrink-0 shadow-md">
                  <img
                    src={scannedResult.photoUrl}
                    alt="Розпізнаний виріб"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                <div className="font-bold text-sm text-white truncate">
                  {scannedResult.title || 'Ювелірний виріб'}
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1">
                    <Scale className="w-3 h-3 text-amber-400" />
                    <span>
                      {scannedResult.metalType === 'gold' ? 'Золото' : scannedResult.metalType === 'silver' ? 'Срібло' : scannedResult.metalType} {scannedResult.purity} проби
                    </span>
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-medium">
                    Вага:{' '}
                    {scannedResult.metalWeightGrams && scannedResult.metalWeightGrams > 0 ? (
                      <strong className="text-white">{scannedResult.metalWeightGrams} г</strong>
                    ) : (
                      <span className="text-amber-400 font-normal">не вказана</span>
                    )}
                  </span>

                  {scannedResult.retailPrice ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      <span>
                        {scannedResult.retailPrice.toLocaleString('uk-UA')} {scannedResult.currency || 'UAH'}
                      </span>
                    </span>
                  ) : null}

                  {scannedResult.brandName && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-400" />
                      <span>{scannedResult.brandName}</span>
                    </span>
                  )}
                </div>

                {Array.isArray(scannedResult.gemstones) && scannedResult.gemstones.length > 0 && (
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-sky-900/50 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sky-300 font-semibold flex items-center gap-1">
                        <Gem className="w-3.5 h-3.5 text-sky-400" />
                        <span>Вставки каміння ({scannedResult.gemstones.length}):</span>
                      </span>
                      <span className="text-sky-400 font-mono font-bold text-[10px]">
                        Σ ~ ${Math.round(scannedResult.gemstones.reduce((s, g) => s + calculateGemstoneUsdValue(g), 0))} USD
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scannedResult.gemstones.map((gem, i) => {
                        const price = calculateGemstoneUsdValue(gem);
                        return (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/40 text-sky-200 font-medium flex items-center gap-1 text-[11px]"
                          >
                            <span>
                              {gem.count}x {gem.nameUk} ({gem.caratsPerStone} ct{gem.colorQuality && gem.clarityQuality ? ` ${gem.colorQuality}/${gem.clarityQuality}` : ''})
                            </span>
                            <span className="text-amber-300 font-mono font-bold text-[10px]">
                              ~${Math.round(price)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scannedResult.notes && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
                    «{scannedResult.notes}»
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Paste success confirmation */}
        {pasteSuccess && (
          <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Посилання або дані успішно додано з буферу обміну!</span>
          </div>
        )}

        {/* Additional user notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">
              Додаткові примітки для AI (опціонально)
            </label>
            <span className="text-[10px] text-amber-400 font-medium">Пріоритет над сканом</span>
          </div>
          <input
            type="text"
            placeholder="напр. Вага 4.8г, ціна 16500 грн, розмір 17.5"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            onContextMenu={(e) => e.stopPropagation()}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Якщо на фото бирки не видно вагу, ціну або розмір — вкажіть їх тут, і AI обов'язково підставить їх у розрахунок.
          </p>
        </div>

        {/* Custom API Key input */}
        <div
          className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-xs"
          onContextMenu={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Налаштування Gemini AI</span>
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline"
            >
              Отримати безкоштовний ключ
            </a>
          </div>

          <div className="space-y-1">
            <input
              type="password"
              placeholder="Власний Google Gemini API Key (за потреби)"
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
                : 'Використовується автоматичний серверний AI сервіс'}
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
