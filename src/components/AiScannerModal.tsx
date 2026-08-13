import React, { useState } from 'react';
import { X, Upload, Camera, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { CalculationInputs } from '../types';

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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Файл занадто великий. Будь ласка, оберіть фото до 10 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!selectedImage) {
      setError('Будь ласка, завантажте фото бирки чи виробу');
      return;
    }

    setLoading(true);
    setError(null);

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

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Не вдалося розпізнати фото');
      }

      const data = json.data;

      // Map AI returned JSON into CalculationInputs shape
      const mappedInputs: Partial<CalculationInputs> = {
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

      onApplyData(mappedInputs);
      onClose();
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err?.message || 'Помилка сканування');
    } finally {
      setLoading(false);
    }
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
          <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-4 text-center transition-colors bg-slate-950/50">
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
              <label className="cursor-pointer flex flex-col items-center justify-center py-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  Натисніть або перетягніть фото сюди
                </div>
                <div className="text-[11px] text-slate-500">
                  JPG, PNG, WEBP до 10 МБ
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
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
