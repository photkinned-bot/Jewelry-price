import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const nbuRes = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
    if (!nbuRes.ok) {
      throw new Error(`NBU API returned ${nbuRes.status}`);
    }

    const nbuData = await nbuRes.json();
    let usdToUah = 44.71;
    let eurToUah = 51.62;
    let goldGramUsd = 88.5;
    let silverGramUsd = 1.05;
    let platinumGramUsd = 31.8;
    let palladiumGramUsd = 34.2;

    if (Array.isArray(nbuData)) {
      const usdItem = nbuData.find((item: any) => item.cc === 'USD');
      const eurItem = nbuData.find((item: any) => item.cc === 'EUR');
      const xauItem = nbuData.find((item: any) => item.cc === 'XAU');
      const xagItem = nbuData.find((item: any) => item.cc === 'XAG');
      const xptItem = nbuData.find((item: any) => item.cc === 'XPT');
      const xpdItem = nbuData.find((item: any) => item.cc === 'XPD');

      if (usdItem?.rate) usdToUah = Number(usdItem.rate);
      if (eurItem?.rate) eurToUah = Number(eurItem.rate);

      const eurToUsd = (usdToUah > 0 && eurToUah > 0) ? eurToUah / usdToUah : 1.15;

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

      return res.status(200).json({
        updatedAt: new Date().toISOString(),
        source: 'Офіційні котирування НБУ (bank.gov.ua) [Vercel Serverless]',
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
      });
    }

    throw new Error('NBU data invalid format');
  } catch (error: any) {
    console.error('Vercel metal-rates error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Server error' });
  }
}
