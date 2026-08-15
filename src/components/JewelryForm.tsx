import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Scale,
  DollarSign,
  Tag,
  Wrench,
  Percent,
  Layers,
  Award,
  BookOpen,
  Paintbrush,
  Disc,
  Info,
  PenTool,
  Link2,
  ExternalLink,
  Check,
  RotateCcw,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Eye,
  Clipboard,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  CalculationInputs,
  CoatingType,
  Currency,
  EngravingType,
  LaborComplexity,
  MetalRates,
  MetalType,
  SurfaceFinishType,
} from '../types';
import {
  COATING_OPTIONS,
  ENGRAVING_OPTIONS,
  LABOR_COMPLEXITY_OPTIONS,
  METAL_OPTIONS,
  SURFACE_FINISH_OPTIONS,
} from '../data/metalRates';
import { GemstoneInput } from './GemstoneInput';
import { InfoHelper } from './InfoHelper';
import { ImageLightboxModal } from './ImageLightboxModal';
import {
  fetchProductImageFromUrl,
  compressImageFile,
  readImageFromClipboard,
  isValidWebUrl,
} from '../lib/productImageService';
import { EMPTY_CALCULATION_INPUTS, SAMPLE_JEWELRY_ITEMS } from '../data/sampleItems';

interface JewelryFormProps {
  inputs: CalculationInputs;
  onChange: (inputs: CalculationInputs) => void;
  currency: Currency;
  rates?: MetalRates;
  onOpenScanner: () => void;
  selectedTemplateId?: string | null;
  onSelectTemplate?: (id: string | null) => void;
}

export const JewelryForm: React.FC<JewelryFormProps> = ({
  inputs,
  onChange,
  currency,
  rates,
  onOpenScanner,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const [coatingCurrency, setCoatingCurrency] = useState<'UAH' | 'USD'>('UAH');
  const [finishCurrency, setFinishCurrency] = useState<'UAH' | 'USD'>('UAH');
  const [engravingCurrency, setEngravingCurrency] = useState<'UAH' | 'USD'>('UAH');

  // Photo management state
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [imageFetchError, setImageFetchError] = useState<string | null>(null);
  const [imageFetchSuccess, setImageFetchSuccess] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMetalMeta = METAL_OPTIONS.find((m) => m.id === inputs.metalType) || METAL_OPTIONS[0];
  const uahRate = rates?.currencies?.UAH || 41.5;
  const weight = inputs.metalWeightGrams || 0;

  // Auto coating calculation
  const coatingType = inputs.coatingType || 'none';
  const coatingOpt = COATING_OPTIONS.find((c) => c.id === coatingType) || COATING_OPTIONS[0];
  const coatingBaseUsd = rates?.coatingRatesUsd?.[coatingType]?.base ?? coatingOpt.baseRateUsd;
  const coatingPerGramUsd = rates?.coatingRatesUsd?.[coatingType]?.perGram ?? coatingOpt.rateUsdPerGram;
  const autoCoatingCostUsd = coatingType === 'none' ? 0 : coatingBaseUsd + weight * coatingPerGramUsd;
  const autoCoatingCostUah = autoCoatingCostUsd * uahRate;

  // Auto finish calculation
  const surfaceFinish = inputs.surfaceFinish || 'polished';
  const finishOpt = SURFACE_FINISH_OPTIONS.find((f) => f.id === surfaceFinish) || SURFACE_FINISH_OPTIONS[0];
  const finishBaseUsd = rates?.finishRatesUsd?.[surfaceFinish]?.base ?? finishOpt.baseRateUsd;
  const finishPerGramUsd = rates?.finishRatesUsd?.[surfaceFinish]?.perGram ?? finishOpt.rateUsdPerGram;
  const autoFinishCostUsd = surfaceFinish === 'polished' ? 0 : finishBaseUsd + weight * finishPerGramUsd;
  const autoFinishCostUah = autoFinishCostUsd * uahRate;

  // Auto engraving calculation
  const engravingType = inputs.engravingType || 'none';
  const engravingOpt = ENGRAVING_OPTIONS.find((e) => e.id === engravingType) || ENGRAVING_OPTIONS[0];
  const engravingBaseUsd = rates?.engravingRatesUsd?.[engravingType]?.base ?? engravingOpt.baseRateUsd;
  const autoEngravingCostUsd = engravingType === 'none' ? 0 : engravingBaseUsd;
  const autoEngravingCostUah = autoEngravingCostUsd * uahRate;

  const handleFieldChange = (fields: Partial<CalculationInputs>) => {
    if (selectedTemplateId && onSelectTemplate) {
      onSelectTemplate(null);
    }
    onChange({ ...inputs, ...fields });
  };

  // Photo handlers
  const handleProcessImageFile = async (file: File) => {
    try {
      setIsFetchingImage(true);
      setImageFetchError(null);
      const compressedDataUrl = await compressImageFile(file, 700, 0.82);
      handleFieldChange({ photoUrl: compressedDataUrl });
      setImageFetchSuccess('Фото успішно додано!');
      setTimeout(() => setImageFetchSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error processing image:', err);
      setImageFetchError('Не вдалося обробити фото. Спробуйте інший файл.');
    } finally {
      setIsFetchingImage(false);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
    // reset input value so user can re-capture if desired
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
    e.target.value = '';
  };

  const handleFetchImageFromUrl = async (customUrl?: string) => {
    const targetUrl = customUrl || inputs.productUrl;
    if (!targetUrl || !targetUrl.trim()) {
      setImageFetchError('Будь ласка, вкажіть посилання на сторінку товару');
      return;
    }

    try {
      setIsFetchingImage(true);
      setImageFetchError(null);
      setImageFetchSuccess(null);

      const result = await fetchProductImageFromUrl(targetUrl);
      if (result.success && result.imageUrl) {
        const updates: Partial<CalculationInputs> = {
          photoUrl: result.imageUrl,
        };
        // Auto-fill title if currently empty and result contains a nice product title
        if (!inputs.title && result.title) {
          updates.title = result.title.slice(0, 80);
        }
        handleFieldChange(updates);
        setImageFetchSuccess('Фото виробу знайдено та прикріплено!');
        setTimeout(() => setImageFetchSuccess(null), 3500);
      } else {
        setImageFetchError(
          result.error || 'Не вдалося знайти фото за цим посиланням. Спробуйте сфотографувати або завантажити файл.'
        );
      }
    } catch (err: any) {
      console.error('Fetch image error:', err);
      setImageFetchError('Помилка завантаження фото з сайту.');
    } finally {
      setIsFetchingImage(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      setIsFetchingImage(true);
      setImageFetchError(null);
      const imgData = await readImageFromClipboard();
      if (imgData) {
        handleFieldChange({ photoUrl: imgData });
        setImageFetchSuccess('Фото вставлено з буферу обміну!');
        setTimeout(() => setImageFetchSuccess(null), 3000);
      } else {
        setImageFetchError('У буфері обміну не знайдено зображення. Скопіюйте картинку або посилання.');
      }
    } catch (err: any) {
      setImageFetchError('Не вдалося отримати доступ до буферу обміну.');
    } finally {
      setIsFetchingImage(false);
    }
  };

  const handleRemovePhoto = () => {
    handleFieldChange({ photoUrl: undefined });
    setImageFetchSuccess(null);
    setImageFetchError(null);
  };

  const handleMetalTypeChange = (metalType: MetalType) => {
    const meta = METAL_OPTIONS.find((m) => m.id === metalType) || METAL_OPTIONS[0];
    if (selectedTemplateId && onSelectTemplate) {
      onSelectTemplate(null);
    }
    onChange({
      ...inputs,
      metalType,
      purity: meta.defaultPurity,
    });
  };

  const handleLoadSample = (sample: CalculationInputs) => {
    if (selectedTemplateId === sample.id) {
      // Toggle off / clear back to default empty state
      onChange({
        ...EMPTY_CALCULATION_INPUTS,
        currency,
      });
      onSelectTemplate?.(null);
    } else {
      onChange({
        ...sample,
        id: 'calc-' + Date.now(),
        currency, // keep active user currency
      });
      onSelectTemplate?.(sample.id || null);
    }
  };

  const handleResetForm = () => {
    onChange({
      ...EMPTY_CALCULATION_INPUTS,
      currency,
    });
    onSelectTemplate?.(null);
  };

  const hasAnyData =
    Boolean(selectedTemplateId) ||
    Boolean(inputs.title) ||
    Boolean(inputs.brandName) ||
    Boolean(inputs.storeName) ||
    Boolean(inputs.productUrl) ||
    (inputs.metalWeightGrams > 0) ||
    (inputs.retailPrice > 0) ||
    (inputs.gemstones && inputs.gemstones.length > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-6">
      
      {/* Top Title & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span>Параметри Ювелірного Виробу</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Введіть характеристики з цінника або бирки для детального розрахунку
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenScanner}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium text-xs transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Сканувати Бирку з Фото</span>
        </button>
      </div>

      {/* Preset Quick Load Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Швидкі шаблони прикрас для тесту:
            </label>
            <InfoHelper helpKey="quickTemplates" />
          </div>
          {hasAnyData && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors px-2 py-0.5 rounded hover:bg-rose-500/10"
              title="Очистити всі поля до порожніх значень"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Очистити форму</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_JEWELRY_ITEMS.map((sample) => {
            const isSelected = selectedTemplateId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleLoadSample(sample)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200 font-semibold ring-2 ring-amber-400/40 shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-300 hover:text-white'
                }`}
                title={isSelected ? 'Натисніть ще раз, щоб скасувати вибір шаблону' : `Завантажити шаблон: ${sample.title}`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span className="truncate max-w-[170px]">{sample.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Basic info: Title, Type, Store/Brand & Product URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">
              Назва прикраси
            </label>
            <InfoHelper helpKey="itemTitle" />
          </div>
          <input
            type="text"
            placeholder="напр. Каблучка з діамантом"
            value={inputs.title}
            onChange={(e) => handleFieldChange({ title: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300">
              Тип виробу
            </label>
            <InfoHelper helpKey="itemType" />
          </div>
          <select
            value={inputs.itemType}
            onChange={(e) => handleFieldChange({ itemType: e.target.value as any })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          >
            <option value="ring">💍 Каблучка / Перстень</option>
            <option value="necklace">📿 Ланцюжок / Кольє</option>
            <option value="earrings">✨ Сережки</option>
            <option value="bracelet">⌚ Браслет</option>
            <option value="pendant">🔮 Кулон / Підвіска</option>
            <option value="other">💎 Інший виріб</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-300 truncate">
              Бренд або магазин
            </label>
            <InfoHelper helpKey="brandName" />
          </div>
          <input
            type="text"
            placeholder="напр. Cartier, КЮЗ, Укрзолото"
            value={inputs.brandName || ''}
            onChange={(e) => handleFieldChange({ brandName: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Посилання на прикрасу в інтернет-магазині */}
        <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Посилання на прикрасу в інтернет-магазині</span>
              <InfoHelper helpKey="productUrl" />
            </label>
            {inputs.productUrl ? (
              <span className="text-[10px] text-sky-400 font-medium hidden sm:inline">
                Зберігається в історії для швидкого переходу
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">
                Вставте URL товару для автозавантаження фото та збереження
              </span>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="url"
              placeholder="https://... вставте посилання на товар у магазині (напр. rozetka, zolotiyvik, ukrzoloto тощо)"
              value={inputs.productUrl || ''}
              onChange={(e) => handleFieldChange({ productUrl: e.target.value })}
              className={`w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 py-2 text-xs text-sky-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors ${
                inputs.productUrl ? 'pr-44 sm:pr-48' : 'pr-3'
              }`}
            />
            {inputs.productUrl && (
              <div className="absolute right-1.5 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleFetchImageFromUrl()}
                  disabled={isFetchingImage}
                  className="flex items-center space-x-1 px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 font-bold text-[11px] transition-colors shadow"
                  title="Автоматично знайти та завантажити фото товару з цієї сторінки"
                >
                  {isFetchingImage ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
                      <span>Пошук...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3 text-slate-950" />
                      <span className="hidden sm:inline">Підтягнути фото</span>
                      <span className="sm:hidden">Фото</span>
                    </>
                  )}
                </button>

                <a
                  href={
                    inputs.productUrl.startsWith('http://') || inputs.productUrl.startsWith('https://')
                      ? inputs.productUrl
                      : `https://${inputs.productUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-2 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] transition-colors shadow"
                  title="Відкрити сторінку прикраси в інтернет-магазині"
                >
                  <span>Відкрити</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Секція додавання та прев'ю фото виробу */}
        <div className="sm:col-span-2 lg:col-span-3 pt-1">
          {/* Приховані інпути для камери та файлів */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleCameraCapture}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Фотографії та Мініатюра Виробу</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Відображається в картці та зберігається в історії
              </span>
            </div>

            {/* Notification messages */}
            {imageFetchSuccess && (
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{imageFetchSuccess}</span>
              </div>
            )}

            {imageFetchError && (
              <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="flex-1">{imageFetchError}</span>
                <button
                  type="button"
                  onClick={() => setImageFetchError(null)}
                  className="text-rose-400 hover:text-white text-[10px] font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {inputs.photoUrl ? (
              /* Attached Photo Thumbnail Card */
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 bg-slate-950/70 border border-amber-500/30 rounded-xl">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="relative group cursor-pointer shrink-0 rounded-lg overflow-hidden border border-amber-500/40 w-16 h-16 bg-slate-900 shadow-md"
                    title="Натисніть для збільшення фото"
                  >
                    <img
                      src={inputs.photoUrl}
                      alt={inputs.title || 'Фото виробу'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                        Фото прикріплено
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                      {inputs.title || 'Ювелірна прикраса'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Мініатюра відображатиметься в історії та порівняльній таблиці
                    </p>
                  </div>
                </div>

                {/* Quick actions for attached photo */}
                <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1 border border-slate-700"
                    title="Переглянути фото на весь екран"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Переглянути</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1 border border-slate-700"
                    title="Зробити нове фото камерою"
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Камера</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1 border border-slate-700"
                    title="Завантажити інший файл з галереї"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Файл</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 transition-colors"
                    title="Видалити фото"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* No Photo Attached - Controls to take picture or upload */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isFetchingImage}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 hover:border-amber-400/50 border border-slate-700 text-slate-200 hover:text-white transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 text-xs font-semibold group shadow-sm active:scale-95"
                  title="Увімкнути камеру пристрою та сфотографувати прикрасу"
                >
                  <Camera className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Сфотографувати</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFetchingImage}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 hover:border-sky-400/50 border border-slate-700 text-slate-200 hover:text-white transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 text-xs font-semibold group shadow-sm active:scale-95"
                  title="Завантажити фото з комп'ютера або галереї телефону"
                >
                  <Upload className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span>З галереї / файл</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFetchImageFromUrl()}
                  disabled={isFetchingImage}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 hover:border-emerald-400/50 border border-slate-700 text-slate-200 hover:text-white transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 text-xs font-semibold group shadow-sm active:scale-95"
                  title="Підтягнути фотографію з посилання інтернет-магазину"
                >
                  {isFetchingImage ? (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span>З посилання URL</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  disabled={isFetchingImage}
                  className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 hover:border-purple-400/50 border border-slate-700 text-slate-200 hover:text-white transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 text-xs font-semibold group shadow-sm active:scale-95"
                  title="Вставити скопійоване зображення або знімок екрана"
                >
                  <Clipboard className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span>Вставити з буферу</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metal selection & Purity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300">
            Вибір Дорогоцінного Металу
          </label>
          <InfoHelper helpKey="metalType" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METAL_OPTIONS.map((meta) => {
            const isSelected = inputs.metalType === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => handleMetalTypeChange(meta.id)}
                className={`py-3 px-3.5 rounded-xl border transition-all text-center flex items-center justify-center space-x-2 ${
                  isSelected
                    ? `${meta.colorClass} ring-2 ring-amber-400/50 shadow-md font-bold`
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300 font-medium hover:text-white'
                }`}
              >
                <span className="text-sm">{meta.nameUk}</span>
              </button>
            );
          })}
        </div>

        {/* Metal Weight & Purity Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Проба металу
              </label>
              <InfoHelper helpKey="metalPurity" />
            </div>
            <select
              value={inputs.purity}
              onChange={(e) => handleFieldChange({ purity: parseInt(e.target.value) || 585 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              {selectedMetalMeta.purities.map((p) => (
                <option key={p} value={p}>
                  {p} проба ({p === 999 ? 'Чистий 100% метал' : `${(p / 10).toFixed(1)}% чистоти`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Загальна вага виробу (в грамах)
              </label>
              <InfoHelper helpKey="metalWeight" />
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.1"
                placeholder="4.50"
                value={inputs.metalWeightGrams || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  handleFieldChange({ metalWeightGrams: Math.max(0, parseFloat(e.target.value) || 0) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-sans">
                грам (г)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gemstones Section */}
      <div className="pt-2 border-t border-slate-800">
        <GemstoneInput
          gemstones={inputs.gemstones || []}
          onChange={(gemstones) => handleFieldChange({ gemstones })}
        />
      </div>

      {/* Labor Complexity & Loss / Wastage */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Складність Ювелірної Роботи та Втрати (Угар)</span>
          </label>
          <InfoHelper helpKey="laborComplexity" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] text-slate-400">
                Рівень складності виготовлення
              </label>
              <InfoHelper helpKey="laborComplexity" />
            </div>
            <select
              value={inputs.laborComplexity}
              onChange={(e) => {
                const laborComplexity = e.target.value as LaborComplexity;
                const opt = LABOR_COMPLEXITY_OPTIONS.find((o) => o.id === laborComplexity);
                handleFieldChange({
                  laborComplexity,
                  wastagePercent: opt ? opt.typicalWastagePercent : inputs.wastagePercent,
                });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            >
              {LABOR_COMPLEXITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.titleUk}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] text-slate-400">
                Відсоток втрат металу при литті (Угар) %
              </label>
              <InfoHelper helpKey="metalWastage" />
            </div>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="30"
                value={inputs.wastagePercent}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  handleFieldChange({ wastagePercent: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coating & Surface Finish (Оздоблення та Покриття) */}
      <div className="pt-2 border-t border-slate-800 space-y-4">
        
        {/* Section Title */}
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Paintbrush className="w-4 h-4 text-cyan-400" />
            <span>Покриття (Родіювання, Позолота, Чорніння) та Характер Поверхні</span>
          </label>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/80 font-medium">
              Авторозрахунок гальваніки
            </span>
            <InfoHelper helpKey="coatingSection" />
          </div>
        </div>

        {/* Coating Type Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-medium text-slate-300">
              Тип покриття виробу:
            </label>
            <InfoHelper helpKey="coatingSection" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COATING_OPTIONS.map((coat) => {
              const isSelected = (inputs.coatingType || 'none') === coat.id;
              return (
                <button
                  key={coat.id}
                  type="button"
                  onClick={() => handleFieldChange({ coatingType: coat.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/50 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{coat.nameUk}</span>
                    {coat.id !== 'none' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${coat.badgeColor}`}>
                        гальваніка
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {coat.descriptionUk}
                  </p>
                </button>
              );
            })}
          </div>

          {inputs.coatingType && inputs.coatingType !== 'none' && (
            <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    Середня вартість нанесення покриття:
                    <InfoHelper
                      customItem={{
                        id: 'coatingPriceFormula',
                        title: 'Формула вартості покриття (Родій/Позолота)',
                        category: 'Оздоблення',
                        whatIsIt: 'Вартість гальванічного покриття складається з базової фіксованої ціни підготовки ванни та витрат реактивів на кожен грам маси виробу.',
                        priceSource: 'Ринкові розцінки ювелірних гальванічних лабораторій.',
                        impact: 'Додається до виробничої собівартості. Ви можете вказати власну точну ціну, якщо замовляєте покриття окремо в майстерні.',
                      }}
                    />
                  </span>
                  <div className="text-[11px] font-mono text-cyan-300 font-bold pl-5">
                    ~{Math.round(autoCoatingCostUah).toLocaleString('uk-UA')} ₴
                    <span className="text-slate-400 font-normal ml-1">
                      (${(autoCoatingCostUsd).toFixed(2)} USD)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400 text-[11px]">Власна ціна:</span>
                    
                    {/* Currency selector tabs for custom input */}
                    <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCoatingCurrency('UAH')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                          coatingCurrency === 'UAH'
                            ? 'bg-cyan-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ₴ UAH
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoatingCurrency('USD')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                          coatingCurrency === 'USD'
                            ? 'bg-cyan-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        $ USD
                      </button>
                    </div>

                    <input
                      type="number"
                      step={coatingCurrency === 'UAH' ? '5' : '0.5'}
                      min="0"
                      placeholder="Авто"
                      value={
                        inputs.customCoatingCostUsd !== undefined
                          ? coatingCurrency === 'UAH'
                            ? Math.round(inputs.customCoatingCostUsd * uahRate)
                            : inputs.customCoatingCostUsd
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          handleFieldChange({ customCoatingCostUsd: undefined });
                        } else {
                          const num = Math.max(0, parseFloat(val) || 0);
                          const usdVal = coatingCurrency === 'UAH' ? num / uahRate : num;
                          handleFieldChange({ customCoatingCostUsd: usdVal });
                        }
                      }}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {inputs.customCoatingCostUsd !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {coatingCurrency === 'UAH'
                        ? `= $${inputs.customCoatingCostUsd.toFixed(2)} USD`
                        : `= ~${Math.round(inputs.customCoatingCostUsd * uahRate)} ₴ UAH`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Surface Finish / Texture Selection */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-medium text-slate-300 flex items-center space-x-1">
              <Disc className="w-3.5 h-3.5 text-amber-400" />
              <span>Характер поверхні (Текстура / Фактура):</span>
            </label>
            <InfoHelper helpKey="surfaceFinish" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SURFACE_FINISH_OPTIONS.map((finish) => {
              const isSelected = (inputs.surfaceFinish || 'polished') === finish.id;
              return (
                <button
                  key={finish.id}
                  type="button"
                  onClick={() => handleFieldChange({ surfaceFinish: finish.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/50 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{finish.nameUk}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {finish.descriptionUk}
                  </p>
                </button>
              );
            })}
          </div>

          {inputs.surfaceFinish && inputs.surfaceFinish !== 'polished' && (
            <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Вартість додаткової фактурної обробки:
                    <InfoHelper helpKey="surfaceFinish" />
                  </span>
                  <div className="text-[11px] font-mono text-amber-300 font-bold pl-5">
                    ~{Math.round(autoFinishCostUah).toLocaleString('uk-UA')} ₴
                    <span className="text-slate-400 font-normal ml-1">
                      (${(autoFinishCostUsd).toFixed(2)} USD)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400 text-[11px]">Власна ціна:</span>

                    {/* Currency selector tabs for custom input */}
                    <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setFinishCurrency('UAH')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                          finishCurrency === 'UAH'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ₴ UAH
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinishCurrency('USD')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                          finishCurrency === 'USD'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        $ USD
                      </button>
                    </div>

                    <input
                      type="number"
                      step={finishCurrency === 'UAH' ? '5' : '0.5'}
                      min="0"
                      placeholder="Авто"
                      value={
                        inputs.customFinishCostUsd !== undefined
                          ? finishCurrency === 'UAH'
                            ? Math.round(inputs.customFinishCostUsd * uahRate)
                            : inputs.customFinishCostUsd
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          handleFieldChange({ customFinishCostUsd: undefined });
                        } else {
                          const num = Math.max(0, parseFloat(val) || 0);
                          const usdVal = finishCurrency === 'UAH' ? num / uahRate : num;
                          handleFieldChange({ customFinishCostUsd: usdVal });
                        }
                      }}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {inputs.customFinishCostUsd !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {finishCurrency === 'UAH'
                        ? `= $${inputs.customFinishCostUsd.toFixed(2)} USD`
                        : `= ~${Math.round(inputs.customFinishCostUsd * uahRate)} ₴ UAH`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Engraving Selection (Гравіювання: Лазерне / Ручне) */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-medium text-slate-300 flex items-center space-x-1">
              <PenTool className="w-3.5 h-3.5 text-purple-400" />
              <span>Гравіювання (Лазерне або Ручне):</span>
            </label>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/80 font-medium">
                Автоматична ціна або ручне введення
              </span>
              <InfoHelper helpKey="engravingSection" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ENGRAVING_OPTIONS.map((eng) => {
              const isSelected = (inputs.engravingType || 'none') === eng.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => handleFieldChange({ engravingType: eng.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-950/50 border-purple-400 ring-1 ring-purple-400/50 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{eng.nameUk}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {eng.descriptionUk}
                  </p>
                </button>
              );
            })}
          </div>

          {inputs.engravingType && inputs.engravingType !== 'none' && (
            <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-3 text-xs">
              
              {/* Optional inscription text field */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Напис / Текст гравіювання (опціонально):
                </label>
                <input
                  type="text"
                  placeholder="напр. 'Always & Forever 12.05.2025' або ініціали"
                  value={inputs.engravingText || ''}
                  onChange={(e) => handleFieldChange({ engravingText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-purple-200 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-700/50 pt-2">
                <div className="space-y-0.5">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5 text-xs">
                    <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    Розрахункова (авто) вартість гравіювання:
                    <InfoHelper helpKey="engravingSection" />
                  </span>
                  <div className="text-[11px] font-mono text-purple-300 font-bold pl-5">
                    ~{Math.round(autoEngravingCostUah).toLocaleString('uk-UA')} ₴
                    <span className="text-slate-400 font-normal ml-1">
                      (${(autoEngravingCostUsd).toFixed(2)} USD)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400 text-[11px]">Ручне введення ціни:</span>

                    {/* Currency selector tabs for custom input */}
                    <div className="inline-flex bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEngravingCurrency('UAH')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                          engravingCurrency === 'UAH'
                            ? 'bg-purple-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ₴ UAH
                      </button>
                      <button
                        type="button"
                        onClick={() => setEngravingCurrency('USD')}
                        className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                          engravingCurrency === 'USD'
                            ? 'bg-purple-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        $ USD
                      </button>
                    </div>

                    <input
                      type="number"
                      step={engravingCurrency === 'UAH' ? '10' : '1'}
                      min="0"
                      placeholder="Авто"
                      value={
                        inputs.customEngravingCostUsd !== undefined
                          ? engravingCurrency === 'UAH'
                            ? Math.round(inputs.customEngravingCostUsd * uahRate)
                            : inputs.customEngravingCostUsd
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          handleFieldChange({ customEngravingCostUsd: undefined });
                        } else {
                          const num = Math.max(0, parseFloat(val) || 0);
                          const usdVal = engravingCurrency === 'UAH' ? num / uahRate : num;
                          handleFieldChange({ customEngravingCostUsd: usdVal });
                        }
                      }}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {inputs.customEngravingCostUsd !== undefined ? (
                    <span className="text-[10px] text-purple-300 font-mono">
                      {engravingCurrency === 'UAH'
                        ? `= $${inputs.customEngravingCostUsd.toFixed(2)} USD (Встановлено вручну)`
                        : `= ~${Math.round(inputs.customEngravingCostUsd * uahRate)} ₴ UAH (Встановлено вручну)`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-sans">
                      Застосовано автоматичний розрахунок ціни
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Store Retail Price & Currency */}
      <div className="pt-2 border-t border-slate-800 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-amber-300 flex items-center space-x-1.5">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Ціна Виробу в Магазині (Чек / Цінник)</span>
          </label>
          <InfoHelper helpKey="retailPrice" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="number"
              step="10"
              min="0"
              placeholder="введіть ціну в магазині"
              value={inputs.retailPrice || ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) =>
                handleFieldChange({ retailPrice: Math.max(0, parseFloat(e.target.value) || 0) })
              }
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-lg font-extrabold text-amber-300 focus:outline-none focus:border-amber-400 shadow-inner"
            />
          </div>

          <div>
            <select
              value={inputs.currency}
              onChange={(e) => handleFieldChange({ currency: e.target.value as Currency })}
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-3 text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="UAH">₴ Гривня (UAH)</option>
              <option value="USD">$ Долар (USD)</option>
              <option value="EUR">€ Євро (EUR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={inputs.photoUrl}
        title={inputs.title}
        onRemove={handleRemovePhoto}
      />

    </div>
  );
};
