import { CalculationInputs, CalculationResult, Currency } from '../types';
import { formatMoney } from '../data/metalRates';

export interface SharedPayload {
  v: number;
  inputs: CalculationInputs;
  currency?: Currency;
}

/**
 * Encodes data to a URL-safe Base64 string supporting Unicode (Ukrainian cyrillic)
 */
export function encodeDataToUrlSafe(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Error encoding share data:', err);
    return '';
  }
}

/**
 * Decodes URL-safe Base64 string back to an object
 */
export function decodeDataFromUrlSafe<T = unknown>(str: string): T | null {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded) as T;
  } catch (err) {
    console.error('Error decoding share data:', err);
    return null;
  }
}

/**
 * Generates the full shareable URL containing the encoded calculation
 */
export function getShareUrl(inputs: CalculationInputs, currency: Currency = 'UAH'): string {
  const payload: SharedPayload = {
    v: 2,
    inputs,
    currency,
  };
  const encoded = encodeDataToUrlSafe(payload);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?calc=${encoded}`;
}

/**
 * Parses the current URL to check if a shared calculation is present
 */
export function parseShareUrlFromLocation(): { inputs: CalculationInputs; currency?: Currency } | null {
  try {
    // Check search params first (?calc=...)
    const urlParams = new URLSearchParams(window.location.search);
    let calcParam = urlParams.get('calc');

    // Fallback check in hash (#calc=...)
    if (!calcParam && window.location.hash) {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      calcParam = hashParams.get('calc');
    }

    if (!calcParam) return null;

    const payload = decodeDataFromUrlSafe<SharedPayload>(calcParam);
    if (!payload || !payload.inputs || typeof payload.inputs !== 'object') {
      return null;
    }

    return {
      inputs: payload.inputs,
      currency: payload.currency,
    };
  } catch (err) {
    console.warn('Failed to parse share parameter from URL:', err);
    return null;
  }
}

/**
 * Cleans the ?calc parameter from the URL bar without reloading the page
 */
export function removeShareParamFromBrowserUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('calc');
    window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
  } catch (err) {
    console.warn('Could not replace browser history state:', err);
  }
}

/**
 * Generates formatted text summary for sharing in messengers
 */
export function getShareMessageText(
  inputs: CalculationInputs,
  result: CalculationResult,
  currency: Currency,
  shareUrl: string
): string {
  const metalName = inputs.metalType === 'gold' ? 'Золото' :
    inputs.metalType === 'silver' ? 'Срібло' :
    inputs.metalType === 'platinum' ? 'Платина' : 'Паладій';

  const gemsSummary = inputs.gemstones && inputs.gemstones.length > 0
    ? inputs.gemstones.map((g) => `${g.count}x ${g.nameUk} (${g.caratsPerStone * g.count}ct)`).join(', ')
    : 'Без каміння';

  const lines = [
    `💎 Розрахунок прикраси: «${inputs.title || 'Ювелірний виріб'}»`,
    inputs.storeName ? `🏬 Магазин/Бренд: ${inputs.storeName}` : '',
    `💰 Ціна на вітрині: ${formatMoney(result.retailPrice, currency)}`,
    `⚖️ Матеріал: ${metalName} ${inputs.purity} (${inputs.metalWeightGrams} г)`,
    `✨ Вставки: ${gemsSummary}`,
    `🪙 Реальна собівартість металу та каміння: ${formatMoney(result.rawMaterialsTotal, currency)}`,
    `📊 Націнка магазину: ${result.markupRatio}x (+${result.markupPercent}%)`,
    `🛡️ Орієнтир викупу ломбарду: ${formatMoney(result.pawnshopEstimate, currency)}`,
    '',
    `🔍 Відкрити повний детальний розрахунок у калькуляторі:`,
    shareUrl,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generates direct social network sharing URLs
 */
export function getSocialShareLinks(shareUrl: string, shareText: string, title: string) {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(`Ювелірний розрахунок: ${title}`);

  return {
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    viber: `viber://forward?text=${encodeURIComponent(shareText)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
  };
}

/**
 * Native Share API trigger for mobile & iPad
 */
export async function triggerDeviceShare(data: {
  title: string;
  text: string;
  url: string;
}): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
}
