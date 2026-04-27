import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  favicon: string;
  source: 'ddg' | 'bing' | 'mojeek' | 'google';
}

export interface WikipediaData {
  title: string;
  extract: string;
  url: string;
  image?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface ImageResult {
  url: string;
  thumb: string;
  title: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0'
];

function getRandomHeaders(referer: string = 'https://www.google.com/') {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': referer,
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"'
  };
}

async function jitter() {
  const ms = Math.floor(Math.random() * 400) + 100; // Entre 100ms y 500ms
  return sleep(ms);
}

function cleanUrl(url: string): string {
  try {
    if (!url) return '';
    let target = url;
    
    if (target.startsWith('//')) target = 'https:' + target;
    if (target.startsWith('/') && !target.startsWith('http')) {
      if (!target.includes('?')) target = 'https://duckduckgo.com' + target;
    }
    
    // Extracción de parámetros (recursiva para capas de redirección)
    const params = ['uddg=', 'adurl=', 'url=', 'q=', 'u=', 'r='];
    for (const p of params) {
      if (target.includes(p)) {
        const parts = target.split(p);
        if (parts.length > 1) {
          const found = decodeURIComponent(parts[1].split('&')[0]);
          if (found.startsWith('http')) return cleanUrl(found);
        }
      }
    }
    return target;
  } catch (e) { return url; }
}

async function fetchDDGLite(query: string, page: number = 0): Promise<SearchResult[]> {
  try {
    await jitter();
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&s=${page * 30}&kl=es-es`;
    const res = await fetch(url, { headers: getRandomHeaders('https://lite.duckduckgo.com/') });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $('.result-link').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim();
      const snippet = $(el).closest('tr').next().find('.result-snippet').text().trim();
      
      const realUrl = cleanUrl(href);
      const isAd = href.includes('ad_domain') || href.includes('y.js') || href.includes('ad_provider') || title.toLowerCase() === 'more info';

      if (href && title && !isAd && !realUrl.includes('duckduckgo.com')) {
        results.push({
          title, url: realUrl, description: snippet || 'Ver resultado.',
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(realUrl).hostname}&sz=64`,
          source: 'ddg'
        });
      }
    });
    return results;
  } catch (e) { return []; }
}

async function fetchBing(query: string, page: number = 0): Promise<SearchResult[]> {
  try {
    await jitter();
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=ES&first=${page * 10 + 1}`;
    const res = await fetch(url, { headers: getRandomHeaders('https://www.bing.com/') });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $('.b_algo').each((_, el) => {
      const a = $(el).find('h2 a');
      const href = a.attr('href');
      const title = a.text().trim();
      const desc = $(el).find('.b_caption p, .b_lineclamp2, .b_snippet').first().text().trim();
      
      if (href && title && href.startsWith('http') && !href.includes('bing.com')) {
        results.push({
          title, url: href, description: desc || 'Ver resultado.',
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(href).hostname}&sz=64`,
          source: 'bing'
        });
      }
    });
    return results;
  } catch (e) { return []; }
}

async function fetchMojeek(query: string, page: number = 0): Promise<SearchResult[]> {
  try {
    await jitter();
    const url = `https://www.mojeek.com/search?q=${encodeURIComponent(query)}&s=${page * 10 + 1}`;
    const res = await fetch(url, { headers: getRandomHeaders('https://www.mojeek.com/') });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $('.results-standard > li').each((_, el) => {
      const a = $(el).find('a.title');
      const href = a.attr('href');
      const title = a.text().trim();
      const desc = $(el).find('.s').text().trim();
      if (href && title) {
        results.push({
          title, url: href, description: desc || 'Ver resultado en Mojeek.',
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(href).hostname}&sz=64`,
          source: 'mojeek'
        });
      }
    });
    return results;
  } catch (e) { return []; }
}

const searchCache = new Map<string, { results: SearchResult[], timestamp: number }>();
let globalLastSearch = 0;

export interface SearchResponse {
  results: SearchResult[];
  status: 'ok' | 'waiting';
}

export async function searchWeb(query: string, page: number = 0, userIp: string = 'anon'): Promise<SearchResponse> {
  const cacheKey = `${query}:${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 60000)) return { results: cached.results, status: 'ok' };

  if (Date.now() - globalLastSearch < 1500) await sleep(1500);
  globalLastSearch = Date.now();

  // Llamamos a los 3 motores y combinamos resultados
  const [ddg, bing, mojeek] = await Promise.all([
    fetchDDGLite(query, page),
    fetchBing(query, page),
    fetchMojeek(query, page)
  ]);

  const all = [...ddg, ...bing, ...mojeek];
  const unique = new Set();
  const final = all.filter(res => {
    try {
      const host = new URL(res.url).hostname.replace('www.', '');
      if (unique.has(host)) return false; // Evitar el mismo sitio varias veces (opcional, pero ayuda a diversidad)
      unique.add(host);
      return true;
    } catch (e) { return false; }
  }).slice(0, 25);

  if (final.length > 0) searchCache.set(cacheKey, { results: final, timestamp: Date.now() });
  return { results: final, status: 'ok' };
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  try {
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&cc=ES`, { headers: getRandomHeaders('https://www.bing.com/') });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: ImageResult[] = [];
    $('.iusc').each((_, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const data = JSON.parse(m);
          results.push({ url: data.murl, thumb: data.turl, title: data.t || 'Imagen' });
        } catch (e) {}
      }
    });
    return results.slice(0, 30);
  } catch (e) { return []; }
}

export async function fetchWikipedia(query: string): Promise<WikipediaData | null> {
  try {
    const searchRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`);
    const searchData = await searchRes.json();
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;
    const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const data = await res.json();
    return {
      title: data.title, extract: data.extract, url: data.content_urls.desktop.page, image: data.thumbnail?.source, coordinates: data.coordinates
    };
  } catch (e) { return null; }
}
