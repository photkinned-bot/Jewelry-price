import { MetalRates } from '../types';
import { DEFAULT_METAL_RATES } from '../data/metalRates';

export async function fetchLiveRates(forceRefresh = false): Promise<MetalRates> {
  // 1. First attempt calling server API endpoint (works when server.ts is running)
  try {
    const res = await fetch(`/api/metal-rates${forceRefresh ? '?force=true' : ''}`);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.currencies) {
          return data;
        }
      }
    }
  } catch (err) {
    console.info('Server API /api/metal-rates unavailable (e.g. GitHub Pages static host), falling back to client-side NBU fetch.');
  }

  // 2. Direct client-side fetch from NBU API (works on GitHub Pages and all static hosts)
  try {
    const nbuRes = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
    if (nbuRes.ok) {
      const nbuData = await nbuRes.json();
      if (Array.isArray(nbuData)) {
        let usdToUah = 44.71;
        let eurToUah = 51.62;
        let goldGramUsd = 88.5;
        let silverGramUsd = 1.05;
        let platinumGramUsd = 31.8;
        let palladiumGramUsd = 34.2;

        const usdItem = nbuData.find((item: any) => item.cc === 'USD');
        const eurItem = nbuData.find((item: any) => item.cc === 'EUR');
        const xauItem = nbuData.find((item: any) => item.cc === 'XAU');
        const xagItem = nbuData.find((item: any) => item.cc === 'XAG');
        const xptItem = nbuData.find((item: any) => item.cc === 'XPT');
        const xpdItem = nbuData.find((item: any) => item.cc === 'XPD');

        if (usdItem?.rate) usdToUah = Number(usdItem.rate);
        if (eurItem?.rate) eurToUah = Number(eurItem.rate);

        const eurToUsd = (usdToUah > 0 && eurToUah > 0) ? eurToUah / usdToUah : 1.15;

        // Convert NBU accounting prices (UAH / troy oz) to USD / gram
        if (xauItem?.rate && usdToUah > 0) {
          goldGramUsd = (Number(xauItem.rate) / 31.1034768) / usdToUah;
        }
        if (xagItem?.rate && usdToUah > 0) {
          silverGramUsd = (Number(xagItem.rate) / 31.1034768) / usdToUah;
        }
        if (xptItem?.rate && usdToUah > 0) {
          platinumGramUsd = (Number(xptItem.rate) / 31.1034768) / usdToUah;
        }
        if (xpdItem?.rate && usdToUah > 0) {
          palladiumGramUsd = (Number(xpdItem.rate) / 31.1034768) / usdToUah;
        }

        return {
          ...DEFAULT_METAL_RATES,
          updatedAt: new Date().toISOString(),
          source: 'Офіційні котирування НБУ (bank.gov.ua) [Direct Web]',
          currencies: {
            USD: 1,
            UAH: Math.round(usdToUah * 100) / 100,
            EUR: Math.round(eurToUsd * 100) / 100,
          },
          pureMetalRatesUsd: {
            gold: Math.round(goldGramUsd * 100) / 100,
            silver: Math.round(silverGramUsd * 100) / 100,
            platinum: Math.round(platinumGramUsd * 100) / 100,
            palladium: Math.round(palladiumGramUsd * 100) / 100,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Client-side NBU fetch failed, returning default rates:', err);
  }

  return DEFAULT_METAL_RATES;
}
