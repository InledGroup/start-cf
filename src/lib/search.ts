import * as cheerio from 'cheerio';

// INTERFACES
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  favicon: string;
  source: 'ddg' | 'bing' | 'mojeek' | 'google' | 'marginalia' | 'qwant' | 'wikipedia';
}

export interface WikipediaData {
  title: string;
  extract: string;
  url: string;
  image?: string;
  source?: string;
  official_website?: string;
  coordinates?: { lat: number; lon: number; };
}

export interface SearchResponse {
  results: SearchResult[];
  status: 'ok' | 'waiting';
  zeroClick?: WikipediaData | null;
  engineStats?: Record<string, boolean>;
}

// CONFIGURACIÓN DE SIGILO AVANZADO
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Apple) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Edge/122.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
];

function getStealthHeaders(targetUrl: string) {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const url = new URL(targetUrl);
  
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `https://${url.hostname}/`,
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Sec-CH-UA': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
    'Cache-Control': 'max-age=0'
  };
}

// CONTROL DE SALUD
const engineStatus: Record<string, { lastError: number, cooldown: number }> = {
  ddg: { lastError: 0, cooldown: 0 },
  bing: { lastError: 0, cooldown: 0 },
  mojeek: { lastError: 0, cooldown: 0 },
  google: { lastError: 0, cooldown: 0 },
  marginalia: { lastError: 0, cooldown: 0 },
  qwant: { lastError: 0, cooldown: 0 },
  wikipedia: { lastError: 0, cooldown: 0 },
  wikidata: { lastError: 0, cooldown: 0 }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function smartFetch(url: string, engine: string, customHeaders?: any) {
  const status = engineStatus[engine];
  const now = Date.now();
  
  if (now - status.lastError < status.cooldown) {
    return null;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000); 

    const headers = customHeaders || getStealthHeaders(url);
    const res = await fetch(url, { 
      headers: headers,
      signal: controller.signal 
    });
    clearTimeout(id);
    
    if (res.status === 403 || res.status === 429) {
      console.error(`[Ban] ${engine} bloqueado (${res.status})`);
      status.lastError = now;
      status.cooldown = 30000; // Solo 30 segundos
      return null;
    }

    if (!res.ok) return null;

    const html = await res.text();
    const blockSignals = ['detected unusual traffic', 'captcha-delivery', 'security challenge', 'verify you are a human'];
    
    if (blockSignals.some(sig => html.includes(sig))) {
      status.lastError = now;
      status.cooldown = 30000;
      return null;
    }

    return html;
  } catch (e) {
    return null;
  }
}

function cleanUrl(url: string): string {
  try {
    if (!url) return '';
    let target = url;

    if (target.includes('bing.com/ck/a?!')) {
      const urlObj = new URL(target);
      const uParam = urlObj.searchParams.get('u');
      if (uParam) {
        try {
          let b64 = uParam.startsWith('a1') ? uParam.substring(2) : uParam;
          b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
          while (b64.length % 4) b64 += '=';
          const decoded = atob(b64);
          if (decoded.startsWith('http')) return cleanUrl(decoded);
        } catch(e) {}
      }
    }

    if (target.startsWith('//')) target = 'https:' + target;
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

// MOTORES
async function fetchGoogle(query: string): Promise<SearchResult[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&gbv=1&lr=lang_es&num=20`;
  const html = await smartFetch(url, 'google');
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  $('div.g, div.v7W49e > div, div.tF2Cxc').each((_, el) => {
    const a = $(el).find('a').first();
    const title = $(el).find('h3').first().text();
    const href = cleanUrl(a.attr('href') || '');
    let desc = $(el).find('.VwiC3b, .lnvsc, .yDsk6d, .st, .lEBK9c').text() || 'Ver resultado.';

    if (href && title && !href.includes('google.com')) {
      results.push({ title: title.trim(), url: href, description: desc.trim(), favicon: '', source: 'google' });
    }
  });
  return results;
}

async function fetchBing(query: string): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=ES&setlang=es&FORM=QBLH`;
  const html = await smartFetch(url, 'bing');
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  $('.b_algo, li.b_algo, .b_ans_placeholder').each((_, el) => {
    const a = $(el).find('h2 a, h3 a').first();
    if (!a.length) return;

    const titleEl = a.clone();
    titleEl.find('cite, span, .b_adUrl, .algo_cite, .bc').remove();
    let title = titleEl.text().trim() || a.text().trim();
    if (title.includes('http')) title = title.split('http')[0].trim();

    let desc = $(el).find('.b_caption p, .b_lineclamp3, .b_lineclamp2, .b_snippet, .b_content p').first().text().trim();
    
    if (a.attr('href')) {
      const href = a.attr('href')!;
      if (href.includes('bing.com/videos')) return;
      results.push({ title, url: href, description: desc || 'Ver resultado.', favicon: '', source: 'bing' });
    }
  });
  return results;
}

async function fetchMojeek(query: string): Promise<SearchResult[]> {
  const url = `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': USER_AGENTS[0],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.8',
    'Referer': 'https://www.mojeek.com/'
  };
  
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];
    $('.results-standard > li').each((_, el) => {
      const a = $(el).find('a.title');
      if (a.attr('href') && a.text()) {
        results.push({ title: a.text().trim(), url: a.attr('href')!, description: $(el).find('.s').text().trim(), favicon: '', source: 'mojeek' });
      }
    });
    return results;
  } catch (e) { return []; }
}

async function fetchDDG(query: string): Promise<{results: SearchResult[], zeroClick: any}> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await smartFetch(url, 'ddg');
  if (!html) return { results: [], zeroClick: null };
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  $('.web-result').each((_, el) => {
    const a = $(el).find('.result__a');
    const desc = $(el).find('.result__snippet').text().trim();
    const href = cleanUrl(a.attr('href') || '');
    if (href && a.text()) {
      results.push({ title: a.text().trim(), url: href, description: desc || 'Ver resultado.', favicon: '', source: 'ddg' });
    }
  });
  return { results, zeroClick: null };
}

async function fetchQwant(query: string): Promise<SearchResult[]> {
  const url = `https://www.qwant.com/lite/?q=${encodeURIComponent(query)}&l=es_es`;
  const html = await smartFetch(url, 'qwant');
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $('.result-container').each((_, el) => {
    const a = $(el).find('a.result-link');
    if (a.attr('href')) {
      results.push({
        title: a.text().trim(),
        url: a.attr('href') || '',
        description: $(el).find('.result-snippet, p').first().text().trim() || 'Ver resultado.',
        favicon: '',
        source: 'qwant'
      });
    }
  });
  return results;
}

export async function fetchWikipedia(query: string): Promise<WikipediaData | null> {
  try {
    const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const summaryHtml = await smartFetch(summaryUrl, 'wikipedia');
    
    if (!summaryHtml) {
       // Si falla el summary, intentamos buscar el título correcto primero
       const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
       const searchResText = await smartFetch(searchUrl, 'wikipedia');
       if (searchResText) {
         const searchData = JSON.parse(searchResText);
         if (searchData.query?.search?.length > 0) {
           return fetchWikipedia(searchData.query.search[0].title);
         }
       }
       return null;
    }

    const data = JSON.parse(summaryHtml);
    let official_website = '';

    try {
      const propUrl = `https://es.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(data.title)}&format=json&origin=*`;
      const propDataText = await smartFetch(propUrl, 'wikipedia');
      
      if (propDataText) {
        const propData = JSON.parse(propDataText);
        if (propData.query?.pages) {
          const pageId = Object.keys(propData.query.pages)[0];
          const wikibaseId = propData.query.pages[pageId].pageprops?.wikibase_item;
          
          if (wikibaseId) {
            const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikibaseId}&props=claims&format=json&origin=*`;
            const wdDataText = await smartFetch(wdUrl, 'wikidata');
            
            if (wdDataText) {
              const wdData = JSON.parse(wdDataText);
              if (wdData.entities?.[wikibaseId]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value) {
                official_website = wdData.entities[wikibaseId].claims.P856[0].mainsnak.datavalue.value;
              }
            }
          }
        }
      }
    } catch(e) {}

    return { 
      title: data.title, 
      extract: data.extract, 
      url: data.content_urls.desktop.page, 
      image: data.thumbnail?.source,
      official_website: official_website 
    };
  } catch (e) {
    return null;
  }
}

export async function searchWeb(query: string, page: number = 0, userIp?: string): Promise<SearchResponse> {
  console.log(`[Search] "${query}" (IP: ${userIp || 'unknown'})`);
  const wikiPromise = fetchWikipedia(query).catch(() => null);
  const engineStats: Record<string, boolean> = { bing: false, google: false, ddg: false, mojeek: false, qwant: false };

  const engineTasks = [
    { name: 'bing', fetch: () => fetchBing(query) },
    { name: 'qwant', fetch: () => fetchQwant(query) },
    { name: 'google', fetch: () => fetchGoogle(query) },
    { name: 'ddg', fetch: () => fetchDDG(query).then(d => d.results) },
    { name: 'mojeek', fetch: () => fetchMojeek(query) }
  ];

  const resultsArr = await Promise.all(engineTasks.map(async task => {
    try {
      const results = await task.fetch();
      if (results && results.length > 0) {
        engineStats[task.name] = true;
        return results;
      }
    } catch (e) { console.error(`[Error] ${task.name}:`, e); }
    return [];
  }));

  let accumulatedResults = resultsArr.flat();
  const wiki = await wikiPromise;

  // Insertar Sitio Oficial como primer resultado si existe
  if (wiki?.official_website) {
    const officialResult: SearchResult = {
      title: `Sitio oficial de ${wiki.title}`,
      url: wiki.official_website,
      description: `Página web oficial confirmada para ${wiki.title}.`,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(wiki.official_website).hostname}&sz=64`,
      source: 'wikipedia'
    };
    accumulatedResults.unshift(officialResult);
  }

  if (accumulatedResults.length === 0) {
    try {
      const results = await fetchMojeek(query);
      if (results && results.length > 0) {
        accumulatedResults = results;
        engineStats['mojeek'] = true;
      }
    } catch (e) {}
  }

  const sourcePriority: Record<string, number> = { 'wikipedia': 0, 'google': 1, 'bing': 2, 'qwant': 3, 'ddg': 4, 'mojeek': 10 };
  const unique = new Set();
  const final = accumulatedResults
    .sort((a, b) => (sourcePriority[a.source] || 9) - (sourcePriority[b.source] || 9))
    .filter(res => {
      try {
        const host = new URL(res.url).hostname.replace('www.', '');
        if (unique.has(host)) return false;
        unique.add(host);
        if (!res.favicon) res.favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
        return true;
      } catch { return false; }
    })
    .slice(0, 25);

  return { results: final, status: 'ok', zeroClick: wiki, engineStats };
}

export async function searchImages(query: string) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&cc=ES`;
    const res = await fetch(url, { headers: getStealthHeaders(url) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: any[] = [];
    $('.iusc').each((_, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const data = JSON.parse(m);
          results.push({ url: data.murl, thumb: data.turl, title: data.t || 'Imagen' });
        } catch {}
      }
    });
    return results.slice(0, 30);
  } catch { return []; }
}
