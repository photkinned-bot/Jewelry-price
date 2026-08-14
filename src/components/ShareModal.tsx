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
  Gem,
  TrendingUp,
  FileText
} from 'lucide-react';
import QRCode from 'qrcode';
import { CalculationInputs, CalculationResult, Currency } from '../types';
import { formatMoney } from '../data/metalRates';
import { ModalDialog } from './ModalDialog';
import {
  getShareUrl,
  getShareMessageText,
  getSocialShareLinks,
  triggerDeviceShare,
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const shareUrl = getShareUrl(inputs, currency);
  const shareText = getShareMessageText(inputs, result, currency, shareUrl);
  const socialLinks = getSocialShareLinks(shareUrl, shareText, inputs.title);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 280,
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    await triggerDeviceShare({
      title: `Розрахунок: ${inputs.title || 'Ювелірний виріб'}`,
      text: shareText,
      url: shareUrl,
    });
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Поділитися Розрахунком"
      subtitle="Надішліть цей розрахунок у месенджер або збережіть посилання"
      icon={<Share2 className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>{showQrCode ? 'Сховати QR-код' : 'Показати QR-код'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Готово
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        
        {/* Item Summary Card */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider block">
                Розрахунок для спільного перегляду
              </span>
              <h4 className="text-base font-bold text-white font-serif">
                {inputs.title || 'Ювелірний виріб'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {inputs.metalType === 'gold' ? 'Золото' : inputs.metalType === 'silver' ? 'Срібло' : 'Платина'} {inputs.purity} • {inputs.metalWeightGrams} г
                {inputs.gemstones && inputs.gemstones.length > 0 && ` • ${inputs.gemstones.length} вст.`}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">Ціна в магазині</span>
              <span className="text-base font-black text-white font-mono">
                {formatMoney(result.retailPrice, currency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Вартість сировини</span>
              <span className="font-bold text-amber-300 font-mono">
                {formatMoney(result.rawMaterialsTotal, currency)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Націнка бренду</span>
              <span className="font-bold text-rose-300 font-mono">
                {result.markupRatio}x (+{result.markupPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Пряме посилання на цей розрахунок:</span>
            {copiedLink && (
              <span className="text-emerald-400 text-xs flex items-center space-x-1 animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5" />
                <span>Посилання скопійовано!</span>
              </span>
            )}
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono truncate select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shrink-0 transition-all active:scale-95 ${
                copiedLink
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
              }`}
            >
              {copiedLink ? (
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

        {/* Messengers & Social Share Buttons */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-slate-300 block">
            Швидка відправка в соцмережі та месенджери:
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            
            {/* Telegram */}
            <a
              href={socialLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white transition-all text-xs font-semibold group"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 group-hover:bg-sky-500 flex items-center justify-center transition-colors">
                <Send className="w-3.5 h-3.5 text-sky-300 group-hover:text-slate-950" />
              </div>
              <span>Telegram</span>
            </a>

            {/* Viber */}
            <a
              href={socialLinks.viber}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white transition-all text-xs font-semibold group"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 group-hover:bg-purple-500 flex items-center justify-center transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-purple-300 group-hover:text-slate-950" />
              </div>
              <span>Viber</span>
            </a>

            {/* WhatsApp */}
            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all text-xs font-semibold group"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500 flex items-center justify-center transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300 group-hover:text-slate-950" />
              </div>
              <span>WhatsApp</span>
            </a>

            {/* Facebook */}
            <a
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:text-white transition-all text-xs font-semibold group"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 group-hover:bg-blue-500 flex items-center justify-center transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-blue-300 group-hover:text-slate-950" />
              </div>
              <span>Facebook</span>
            </a>

            {/* X / Twitter */}
            <a
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 group-hover:bg-white flex items-center justify-center transition-colors">
                <span className="font-bold text-xs text-white group-hover:text-slate-950">𝕏</span>
              </div>
              <span>X (Twitter)</span>
            </a>

            {/* Email */}
            <a
              href={socialLinks.email}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all text-xs font-semibold group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 group-hover:bg-amber-400 flex items-center justify-center transition-colors">
                <Mail className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-950" />
              </div>
              <span>Email</span>
            </a>

          </div>

          {/* Native Device Share Sheet (AirDrop / iOS / Android) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-750 hover:from-slate-700 hover:to-slate-650 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Відкрити системне меню (AirDrop, Інші додатки)</span>
            </button>
          )}
        </div>

        {/* Copy Formatted Text Box */}
        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Текстовий підсумок для вставки у чат:</span>
            </span>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
            >
              {copiedText ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Текст скопійовано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Скопіювати текст</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-300 font-mono whitespace-pre-line bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 max-h-32 overflow-y-auto leading-relaxed">
            {shareText}
          </p>
        </div>

        {/* QR Code Collapsible Display */}
        {showQrCode && qrDataUrl && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <img src={qrDataUrl} alt="QR Code для швидкого відкриття" className="w-48 h-48 rounded" />
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-xs font-bold text-white">Відскануйте камерою смартфона</p>
              <p className="text-[11px] text-slate-400">
                Калькулятор миттєво відкриється на іншому пристрої з усіма даними
              </p>
            </div>
          </div>
        )}

      </div>
    </ModalDialog>
  );
};
