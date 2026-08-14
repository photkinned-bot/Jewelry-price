import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Send,
  MessageCircle,
  Mail,
  Smartphone,
  ExternalLink,
  Link2,
  Globe,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CalculationInputs, CalculationResult, Currency } from '../types';
import { formatMoney } from '../data/metalRates';
import { ModalDialog } from './ModalDialog';
import {
  getShareUrl,
  formatShareContent,
  getSocialShareLinks,
  triggerDeviceShare,
  ShareFormatMode,
  isDevSandboxEnvironment,
  getSavedCustomDomain,
  saveCustomDomain,
} from '../lib/shareService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: CalculationInputs;
  result: CalculationResult;
  currency: Currency;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  inputs,
  result,
  currency,
}) => {
  const [shareMode, setShareMode] = useState<ShareFormatMode>('short_summary');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [customDomain, setCustomDomain] = useState<string>('');
  const [showDomainSettings, setShowDomainSettings] = useState(false);
  const [domainSavedNotice, setDomainSavedNotice] = useState(false);

  const isDevEnv = isDevSandboxEnvironment();

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
    setCustomDomain(getSavedCustomDomain());
  }, [isOpen]);

  const shareUrl = getShareUrl(inputs, currency, customDomain || undefined);
  const textToSend = formatShareContent(shareMode, inputs, result, currency, shareUrl);
  const socialLinks = getSocialShareLinks(shareUrl, textToSend, inputs.title);

  // Generate QR code
  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(textToSend);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveDomain = (newDomain: string) => {
    setCustomDomain(newDomain);
    saveCustomDomain(newDomain);
    setDomainSavedNotice(true);
    setTimeout(() => setDomainSavedNotice(false), 3000);
  };

  const handleViberShare = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = socialLinks.viber;
  };

  const handleNativeShare = async () => {
    await triggerDeviceShare({
      title: `Розрахунок: ${inputs.title || 'Ювелірний виріб'}`,
      text: shareMode === 'link_only' ? undefined : textToSend,
      url: shareUrl,
    });
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Поділитися Розрахунком"
      subtitle="Збереження всіх параметрів, цін та посилання на інтернет-магазин"
      icon={<Share2 className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>{showQrCode ? 'Сховати QR' : 'QR-код'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Закрити
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        
        {/* Compact Item Summary Badge */}
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="truncate pr-2">
            <h4 className="text-sm font-bold text-white truncate font-serif">
              {inputs.title || 'Ювелірний виріб'}
            </h4>
            <p className="text-xs text-slate-400">
              {inputs.metalType === 'gold' ? 'Золото' : inputs.metalType === 'silver' ? 'Срібло' : 'Платина'} {inputs.purity} • {inputs.metalWeightGrams} г
              {inputs.gemstones && inputs.gemstones.length > 0 && ` • ${inputs.gemstones.length} вст.`}
            </p>
            {inputs.productUrl && (
              <p className="text-[11px] text-sky-400 truncate flex items-center gap-1 mt-0.5">
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">Магазин: {inputs.productUrl}</span>
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-amber-400 block">
              {formatMoney(result.retailPrice, currency)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Собів.: {formatMoney(result.rawMaterialsTotal, currency)}
            </span>
          </div>
        </div>

        {/* Share Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 block">
            Формат повідомлення для месенджерів:
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setShareMode('short_summary')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                shareMode === 'short_summary'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Коротке інфо
            </button>
            <button
              type="button"
              onClick={() => setShareMode('link_only')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                shareMode === 'link_only'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Лише посилання
            </button>
            <button
              type="button"
              onClick={() => setShareMode('full_details')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center ${
                shareMode === 'full_details'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Повний звіт
            </button>
          </div>
        </div>

        {/* The Short URL / Text Copy Input Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{shareMode === 'link_only' ? 'Посилання для копіювання:' : 'Текст повідомлення та посилання:'}</span>
            </span>
            {copied && (
              <span className="text-emerald-400 text-xs flex items-center space-x-1 font-semibold animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Скопійовано!</span>
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
            {shareMode === 'link_only' ? (
              <input
                type="text"
                readOnly
                value={textToSend}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono truncate select-all focus:outline-none"
              />
            ) : (
              <textarea
                readOnly
                rows={4}
                value={textToSend}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono resize-none select-all focus:outline-none leading-relaxed"
              />
            )}
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shrink-0 transition-all active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Скопійовано</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Копіювати</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fast Messenger Buttons */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">
            Швидка відправка в месенджери:
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* Viber */}
            <button
              type="button"
              onClick={handleViberShare}
              className="flex items-center space-x-2 p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white transition-all text-xs font-semibold"
            >
              <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <span className="truncate">Viber</span>
            </button>

            {/* Telegram */}
            <a
              href={socialLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white transition-all text-xs font-semibold"
            >
              <div className="w-6 h-6 rounded-md bg-sky-500/20 flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5 text-sky-300" />
              </div>
              <span className="truncate">Telegram</span>
            </a>

            {/* WhatsApp */}
            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all text-xs font-semibold"
            >
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="truncate">WhatsApp</span>
            </a>

            {/* Email */}
            <a
              href={socialLinks.email}
              className="flex items-center space-x-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold"
            >
              <div className="w-6 h-6 rounded-md bg-slate-700 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <span className="truncate">Email</span>
            </a>

          </div>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full mt-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Системне меню "Поділитися" (AirDrop, чати, SMS)</span>
            </button>
          )}
        </div>

        {/* Explain Dev Environment & Allow Setting Published Production Domain */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          {isDevEnv && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-xs text-amber-200/90 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Info className="w-4 h-4 shrink-0" />
                <span>Чому з'являється «Action required» у Safari / iPad:</span>
              </div>
              <p className="text-[11px] text-amber-100/80">
                Ви зараз перебуваєте в <b>тестовому середовищі розробника AI Studio</b> (адреса закінчується на <code className="text-amber-300">.run.app</code>), яке захищене паролем Google.
              </p>
              <p className="text-[11px] text-amber-100/80">
                Коли ви завантажите застосунок на <b>GitHub Pages</b> або <b>Vercel</b> — посилання відкриватиметься миттєво у будь-якої людини без жодних паролів і помилок.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDomainSettings(!showDomainSettings)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {customDomain ? `Робочий домен: ${customDomain}` : 'Вказати адресу вашого сайту (GitHub Pages / Vercel)'}
              </span>
            </button>
          </div>

          {showDomainSettings && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <label className="text-[11px] text-slate-400 block">
                Введіть публічну адресу вашого опублікованого сайту (наприклад: <span className="text-amber-400">https://myname.github.io/calc/</span> або <span className="text-amber-400">https://jewelry.vercel.app/</span>):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://your-domain.github.io/app/"
                  value={customDomain}
                  onChange={(e) => handleSaveDomain(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
                {customDomain && (
                  <button
                    type="button"
                    onClick={() => handleSaveDomain('')}
                    className="px-2 py-1.5 text-[11px] text-slate-400 hover:text-rose-400"
                  >
                    Скинути
                  </button>
                )}
              </div>
              {domainSavedNotice && (
                <p className="text-[11px] text-emerald-400 font-semibold">
                  ✓ Публічну адресу збережено! Тепер посилання генеруються для вашого сайту.
                </p>
              )}
            </div>
          )}
        </div>

        {/* QR Code Collapsible Display */}
        {showQrCode && qrDataUrl && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 rounded" />
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-xs font-bold text-white">Відскануйте камерою телефону</p>
              <p className="text-[10px] text-slate-400">
                Миттєво відкриває розрахунок у браузері
              </p>
            </div>
          </div>
        )}

      </div>
    </ModalDialog>
  );
};
