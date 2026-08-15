import type { VercelRequest, VercelResponse } from '@vercel/node';

function resolveAbsoluteUrl(imgUrl: string, baseUrl: string): string {
  if (!imgUrl) return '';
  const trimmed = imgUrl.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

function extractMetaTags(html: string, pageUrl: string) {
  let imageUrl: string | undefined;
  let title: string | undefined;
  let description: string | undefined;

  // 1. OpenGraph Image
  const ogImgMatch =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
    html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImgMatch && ogImgMatch[1]) {
    imageUrl = ogImgMatch[1].trim();
  }

  // 2. Twitter Image
  if (!imageUrl) {
    const twImgMatch =
      html.match(/<meta[^>]+name=["']twitter:image(?:[:_]src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?:[:_]src)?["']/i);
    if (twImgMatch && twImgMatch[1]) {
      imageUrl = twImgMatch[1].trim();
    }
  }

  // 3. Schema.org JSON-LD
  if (!imageUrl) {
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match[1];
        const parsed = JSON.parse(jsonContent);
        const findImg = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.image) {
            if (typeof obj.image === 'string') imageUrl = obj.image;
            else if (Array.isArray(obj.image) && obj.image[0]) {
              imageUrl = typeof obj.image[0] === 'string' ? obj.image[0] : obj.image[0].url;
            } else if (obj.image.url) {
              imageUrl = obj.image.url;
            }
          }
          if (!imageUrl && obj['@graph'] && Array.isArray(obj['@graph'])) {
            obj['@graph'].forEach(findImg);
          }
        };
        findImg(parsed);
        if (imageUrl) break;
      } catch {
        // Ignore invalid JSON in script tag
      }
    }
  }

  // 4. Link rel image_src / itemprop image
  if (!imageUrl) {
    const linkMatch =
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i);
    if (linkMatch && linkMatch[1]) {
      imageUrl = linkMatch[1].trim();
    }
  }

  // Title
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Description
  const descMatch =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  if (imageUrl) {
    imageUrl = resolveAbsoluteUrl(imageUrl, pageUrl);
  }

  return { imageUrl, title, description };
}

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

  const rawUrl = (req.method === 'POST' ? req.body?.url : req.query?.url) as string | undefined;

  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'Параметр url обовʼязковий' });
  }

  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // If directly image
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(targetUrl)) {
    return res.status(200).json({
      success: true,
      imageUrl: targetUrl,
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(10000),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      return res.status(200).json({
        success: true,
        imageUrl: targetUrl,
      });
    }

    const html = await response.text();
    const extracted = extractMetaTags(html, targetUrl);

    if (extracted.imageUrl) {
      return res.status(200).json({
        success: true,
        imageUrl: extracted.imageUrl,
        title: extracted.title,
        description: extracted.description,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Не знайдено превʼю зображення для вказаної сторінки',
    });
  } catch (error: any) {
    console.error('fetch-product-image error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Помилка завантаження сторінки',
    });
  }
}
