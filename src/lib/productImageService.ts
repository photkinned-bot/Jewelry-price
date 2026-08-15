/**
 * Helper service to extract product photos from store web pages,
 * capture device photos from camera / gallery, and optimize image size for local storage.
 */

export interface FetchedImageResult {
  success: boolean;
  imageUrl?: string;
  title?: string;
  description?: string;
  error?: string;
}

/**
 * Validates whether a string looks like a valid http(s) URL
 */
export function isValidWebUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?(\?.*)?$/i.test(trimmed);
}

/**
 * Normalizes URL string by ensuring it starts with https://
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Checks if a URL directly points to an image file based on extension
 */
export function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)$/i.test(clean);
}

/**
 * Resolves a potentially relative image URL against the page base URL
 */
export function resolveAbsoluteUrl(imgUrl: string, baseUrl: string): string {
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

/**
 * Compresses an image (File or Blob) into a lightweight JPEG data URL (~25-50KB)
 * so it can be safely and quickly persisted in localStorage without exceeding quotas.
 */
export function compressImageFile(
  fileOrBlob: Blob | File,
  maxDimension = 600,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Не вдалося створити контекст малювання'));
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не вдалося прочитати файл зображення'));
    };

    img.src = objectUrl;
  });
}

/**
 * Parses HTML string to find OpenGraph, Twitter, Schema.org, and product image tags
 */
export function extractImageFromHtml(html: string, pageUrl: string): { imageUrl?: string; title?: string; description?: string } {
  if (!html) return {};

  let imageUrl: string | undefined;
  let title: string | undefined;
  let description: string | undefined;

  // 1. Try DOMParser in browser environment
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Title
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
        doc.querySelector('title')?.textContent;
      if (ogTitle) title = ogTitle.trim();

      // Description
      const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="description"]')?.getAttribute('content');
      if (ogDesc) description = ogDesc.trim();

      // 1. OpenGraph image (og:image or og:image:secure_url)
      const ogImg = doc.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content') ||
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="og:image"]')?.getAttribute('content');
      if (ogImg) imageUrl = ogImg.trim();

      // 2. Twitter Image
      if (!imageUrl) {
        const twitterImg = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content');
        if (twitterImg) imageUrl = twitterImg.trim();
      }

      // 3. Schema.org JSON-LD scripts
      if (!imageUrl) {
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (let i = 0; i < jsonLdScripts.length; i++) {
          try {
            const rawJson = jsonLdScripts[i].textContent || '';
            const parsed = JSON.parse(rawJson);
            const checkObj = (obj: any) => {
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
                obj['@graph'].forEach(checkObj);
              }
            };
            checkObj(parsed);
            if (imageUrl) break;
          } catch {
            // Ignore invalid JSON in script tag
          }
        }
      }

      // 4. Link rel image_src / thumbnail
      if (!imageUrl) {
        const linkImg = doc.querySelector('link[rel="image_src"]')?.getAttribute('href') ||
          doc.querySelector('meta[name="thumbnail"]')?.getAttribute('content') ||
          doc.querySelector('meta[itemprop="image"]')?.getAttribute('content');
        if (linkImg) imageUrl = linkImg.trim();
      }

      // 5. Common product gallery / main image classes
      if (!imageUrl) {
        const productImg = doc.querySelector('img[class*="product-image"], img[class*="gallery__image"], img[id*="product-main-image"], img[itemprop="image"]') as HTMLImageElement | null;
        if (productImg) {
          const src = productImg.getAttribute('data-src') || productImg.getAttribute('src');
          if (src && !src.includes('data:image/svg') && !src.includes('placeholder')) {
            imageUrl = src.trim();
          }
        }
      }
    } catch (e) {
      console.warn('DOMParser extraction error:', e);
    }
  }

  // Fallback regex extraction if DOMParser failed or returned nothing
  if (!imageUrl) {
    const ogMatch = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?:[:_]src)?["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) {
      imageUrl = ogMatch[1].trim();
    }
  }

  if (imageUrl) {
    imageUrl = resolveAbsoluteUrl(imageUrl, pageUrl);
  }

  return { imageUrl, title, description };
}

/**
 * Fetches the product photo from a store URL.
 * Automatically tries backend proxy first, then falls back to public CORS proxy if on static host.
 */
export async function fetchProductImageFromUrl(rawUrl: string): Promise<FetchedImageResult> {
  if (!rawUrl || !rawUrl.trim()) {
    return { success: false, error: 'Вкажіть посилання на товар' };
  }

  const url = normalizeUrl(rawUrl);

  // If the URL directly points to an image file
  if (isDirectImageUrl(url)) {
    return {
      success: true,
      imageUrl: url,
    };
  }

  // 1. Try local server API endpoint /api/fetch-product-image
  try {
    const response = await fetch('/api/fetch-product-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.imageUrl) {
        return {
          success: true,
          imageUrl: data.imageUrl,
          title: data.title,
          description: data.description,
        };
      } else if (data.error) {
        console.info('Server fetch returned message:', data.error);
      }
    }
  } catch (serverErr) {
    console.info('Server endpoint /api/fetch-product-image unavailable, attempting client fallback:', serverErr);
  }

  // 2. Client-side fallback via public CORS proxy (for GitHub Pages or static deploys)
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      const html = json.contents;
      if (html && typeof html === 'string') {
        const extracted = extractImageFromHtml(html, url);
        if (extracted.imageUrl) {
          return {
            success: true,
            imageUrl: extracted.imageUrl,
            title: extracted.title,
            description: extracted.description,
          };
        }
      }
    }
  } catch (proxyErr) {
    console.info('AllOrigins proxy attempt error:', proxyErr);
  }

  // 3. Second fallback proxy
  try {
    const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res2 = await fetch(proxyUrl2, { signal: AbortSignal.timeout(8000) });
    if (res2.ok) {
      const html = await res2.text();
      const extracted = extractImageFromHtml(html, url);
      if (extracted.imageUrl) {
        return {
          success: true,
          imageUrl: extracted.imageUrl,
          title: extracted.title,
          description: extracted.description,
        };
      }
    }
  } catch (proxy2Err) {
    console.info('CorsProxy attempt error:', proxy2Err);
  }

  return {
    success: false,
    error: 'Не вдалося автоматично знайти фото на цій сторінці. Ви можете завантажити фото виробу вручну або зробити знімок камерою.',
  };
}

/**
 * Reads an image from the user's clipboard if available
 */
export async function readImageFromClipboard(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Буфер обміну не підтримується');
  }

  // Try navigator.clipboard.read()
  if (navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          return await compressImageFile(blob);
        }
      }
    } catch (err) {
      console.info('Clipboard read error or permission denied:', err);
    }
  }

  // Try readText for direct image data URL or image URL
  if (navigator.clipboard.readText) {
    const text = await navigator.clipboard.readText();
    if (text && (text.startsWith('data:image/') || isDirectImageUrl(text))) {
      return text.trim();
    }
  }

  return null;
}
