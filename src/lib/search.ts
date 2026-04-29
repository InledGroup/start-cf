import * as cheerio from 'cheerio';

// INTERFACES
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  favicon: string;
  source: 'ddg' | 'bing' | 'mojeek' | 'google' | 'marginalia';
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
  qwant: { lastError: 0, cooldown: 0 }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function smartFetch(url: string, engine: string, customHeaders?: any) {
  const status = engineStatus[engine];
  if (Date.now() - status.lastError < status.cooldown) {
    console.log(`[Cooldown] ${engine} en espera. Restante: ${Math.ceil((status.cooldown - (Date.now() - status.lastError)) / 1000)}s`);
    return null;
  }

  // Jitter aleatorio para no parecer un bot rítmico (100-500ms)
  await sleep(Math.floor(Math.random() * 400) + 100);

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // Aumentado a 10s para Cloudflare

    const headers = customHeaders || getStealthHeaders(url);
    const res = await fetch(url, { 
      headers: headers,
      signal: controller.signal 
    });
    clearTimeout(id);
    
    if (res.status === 403 || res.status === 429) {
      console.error(`[Ban] ${engine} bloqueado (${res.status}) en URL: ${url}`);
      status.lastError = Date.now();
      status.cooldown = 600000; // 10 min de baneo
      return null;
    }

    if (!res.ok) {
      console.error(`[Error] ${engine} devuelto status ${res.status}`);
      return null;
    }

    const html = await res.text();
    const blockSignals = [
      'detected unusual traffic', 
      'captcha-delivery', 
      'robot', 
      'security challenge', 
      'nuestro sistema ha detectado',
      'Please complete the security check',
      'verify you are a human'
    ];
    
    if (blockSignals.some(sig => html.includes(sig))) {
      console.error(`[Ban] ${engine} detectó bot por contenido en el HTML.`);
      status.lastError = Date.now();
      status.cooldown = 600000;
      return null;
    }

    return html;
  } catch (e: any) {
    console.error(`[Fatal] Error de red o timeout en ${engine}:`, e.message || e);
    return null;
  }
}

function cleanUrl(url: string): string {
  try {
    if (!url) return '';
    let target = url;

    // Decodificar tracking de Bing si existe (u=a1...)
    if (target.includes('bing.com/ck/a?!')) {
      const urlObj = new URL(target);
      const uParam = urlObj.searchParams.get('u');
      if (uParam) {
        try {
          // Eliminar el prefijo 'a1' si existe
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
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&gbv=1&lr=lang_es`;
  const html = await smartFetch(url, 'google');
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $('div.g').each((_, el) => {
    const a = $(el).find('a').first();
    const title = $(el).find('h3').text();
    const href = cleanUrl(a.attr('href') || '');
    if (href && title) {
      results.push({ title, url: href, description: $(el).find('.VwiC3b').text() || 'Ver resultado.', favicon: '', source: 'google' });
    }
  });
  return results;
}

async function fetchBing(query: string): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=ES&setlang=es&FORM=QBLH&sp=-1&ghc=1`;
  
  // Bing suele ser más permisivo si ve una cookie de sesión (fingida)
  const fakeSessionId = Math.random().toString(36).substring(2, 15).toUpperCase();
  const stealthHeaders = getStealthHeaders(url);
  const headers = {
    ...stealthHeaders,
    'Cookie': `SRCHD=AF=NOFORM; SRCHUSR=DOB=20240327; _EDGE_S=F=1&ID=${fakeSessionId}; _SS=SID=${fakeSessionId}`,
  };

  const html = await smartFetch(url, 'bing', headers);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  
  $('.b_algo, li.b_algo, .b_ans_placeholder').each((_, el) => {
    const a = $(el).find('h2 a, h3 a, a').first();
    // Selectores de descripción ampliados para mayor cobertura
    let desc = $(el).find('.b_caption p, .b_lineclamp3, .b_lineclamp2, .b_algoSlug, .b_par_cnt, .b_snippet, .b_content p, div.b_caption, .b_vPanel p').first().text();
    
    // Si sigue vacío, intentamos buscar cualquier párrafo o div con texto largo dentro del elemento
    if (!desc) {
      $(el).find('p, div').each((_, subEl) => {
        const text = $(subEl).text().trim();
        if (text.length > 25 && text.length > (desc?.length || 0)) {
          desc = text;
        }
      });
    }

    if (a.attr('href') && a.text()) {
      const url = a.attr('href')!;
      if (!url.startsWith('http') || url.includes('bing.com/videos') || url.includes('bing.com/images')) return;
      
      results.push({ 
        title: a.text().trim(), 
        url: url, 
        description: desc.trim() || 'Ver resultado.', 
        favicon: '', 
        source: 'bing' 
      });
    }
  });
  return results;
}

async function fetchMojeek(query: string): Promise<SearchResult[]> {
  const url = `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`;
  // Mojeek prefiere cabeceras más simples
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
        results.push({ title: a.text(), url: a.attr('href')!, description: $(el).find('.s').text(), favicon: '', source: 'mojeek' });
      }
    });
    return results;
  } catch (e) {
    console.error('[Mojeek] Error:', e);
    return [];
  }
}

async function fetchMarginalia(query: string): Promise<SearchResult[]> {
  const url = `https://search.marginalia.nu/search?query=${encodeURIComponent(query)}`;
  const html = await smartFetch(url, 'marginalia');
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $('section.search-result').each((_, el) => {
    const a = $(el).find('a').first();
    if (a.attr('href') && a.text()) {
      results.push({ title: a.text(), url: a.attr('href')!, description: $(el).find('p.description').text(), favicon: '', source: 'marginalia' });
    }
  });
  return results;
}

async function fetchDDG(query: string): Promise<{results: SearchResult[], zeroClick: any}> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const html = await smartFetch(url, 'ddg');
  if (!html) return { results: [], zeroClick: null };
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  $('.result-link').each((_, el) => {
    const href = cleanUrl($(el).attr('href') || '');
    if (href && $(el).text()) {
      results.push({ title: $(el).text(), url: href, description: '', favicon: '', source: 'ddg' });
    }
  });
  return { results, zeroClick: null };
}

export async function fetchWikipedia(query: string): Promise<WikipediaData | null> {
  try {
    const headers = {
      'User-Agent': USER_AGENTS[0],
      'Accept': 'application/json',
      'Accept-Language': 'es-ES,es;q=0.9'
    };

    const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { headers });
    
    // Si no hay resultado directo, intentamos buscar el título correcto
    if (res.status === 404 || !res.ok) {
       const searchRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`, { headers });
       const searchData = await searchRes.json();
       if (searchData.query?.search?.length > 0) {
         const bestMatch = searchData.query.search[0].title;
         return fetchWikipedia(bestMatch); // Reintento con el título exacto
       }
       return null;
    }

    const data = await res.json();
    
    // Buscar sitio web oficial via Wikidata (Propiedad P856)
    let official_website = '';
    try {
      // 1. Obtener el ID de Wikidata (item Qxxx) para esta página
      const propRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(data.title)}&format=json&origin=*`, { headers });
      const propData = await propRes.json();
      
      if (propData.query && propData.query.pages) {
        const pageId = Object.keys(propData.query.pages)[0];
        const wikibaseId = propData.query.pages[pageId].pageprops?.wikibase_item;

        if (wikibaseId) {
          console.log(`[Wiki] Entidad Wikidata encontrada: ${wikibaseId}`);
          // 2. Consultar la propiedad P856 (Sitio web oficial) con headers de sigilo
          const wdRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikibaseId}&props=claims&format=json&origin=*`, { headers });
          const wdData = await wdRes.json();
          
          if (wdData.entities && wdData.entities[wikibaseId]) {
            const claims = wdData.entities[wikibaseId].claims;
            if (claims && claims.P856 && claims.P856[0]?.mainsnak?.datavalue?.value) {
              official_website = claims.P856[0].mainsnak.datavalue.value;
              console.log(`[Wiki] Sitio oficial encontrado: ${official_website}`);
            }
          }
        }
      }
    } catch(e) {
      console.error('[Wiki] Error buscando sitio oficial:', e);
    }

    return { 
      title: data.title, 
      extract: data.extract, 
      url: data.content_urls.desktop.page, 
      image: data.thumbnail?.source,
      official_website: official_website
    };
  } catch { return null; }
}

// MOTOR PRINCIPAL CON CASCADA DE FALLO (Failover)
export async function searchWeb(query: string, page: number = 0, userIp?: string): Promise<SearchResponse> {
  console.log(`[Search] Inmune Search: "${query}" (IP: ${userIp || 'unknown'})`);
  
  const wikiPromise = fetchWikipedia(query).catch(() => null);
  const engineStats: Record<string, boolean> = {
    bing: false,
    qwant: false,
    google: false,
    ddg: false,
    mojeek: false
  };

  const engines = [
    { name: 'bing', fetch: () => fetchBing(query) },
    { name: 'qwant', fetch: async () => {
        const res = await smartFetch(`https://www.qwant.com/lite/?q=${encodeURIComponent(query)}&l=es_es`, 'qwant');
        if (!res) return [];
        const $ = cheerio.load(res);
        const results: SearchResult[] = [];
        $('.result-container').each((_, el) => {
          const a = $(el).find('a.result-link');
          const desc = $(el).find('.result-snippet, .result-desc, p').first().text();
          if (a.attr('href')) {
            results.push({
              title: a.text(),
              url: a.attr('href') || '',
              description: desc || 'Ver resultado.',
              favicon: '',
              source: 'qwant' as any
            });
          }
        });
        return results;
      }
    },
    { name: 'google', fetch: () => fetchGoogle(query) },
    { name: 'ddg', fetch: async () => {
        const data = await fetchDDG(query);
        return data.results;
      }
    },
    { name: 'mojeek', fetch: () => fetchMojeek(query) }
  ];

  let accumulatedResults: SearchResult[] = [];
  
  // Ejecución secuencial inteligente: acumulamos si no hay suficientes
  for (const engine of engines) {
    try {
      console.log(`[Try] Intentando con ${engine.name.toUpperCase()}...`);
      const results = await engine.fetch();
      
      if (results && results.length > 0) {
        engineStats[engine.name] = true;
        accumulatedResults = [...accumulatedResults, ...results];
        console.log(`[Success] ${engine.name.toUpperCase()} añadió ${results.length} resultados.`);
        
        // Si ya tenemos bastantes resultados acumulados de motores de calidad, no seguimos quemando
        if (accumulatedResults.length >= 7 && engine.name !== 'mojeek') {
          break; 
        }
      } else {
        console.warn(`[Fail] ${engine.name.toUpperCase()} no devolvió resultados.`);
      }
    } catch (e: any) {
      console.error(`[Error] Fallo crítico en ${engine.name}:`, e.message || e);
    }
  }

  // FALLBACK DE EMERGENCIA: Si no hay NADA, intentamos Mojeek directo con cabeceras mínimas
  if (accumulatedResults.length === 0) {
    console.log('[Emergency] Intentando Mojeek simplificado como último recurso...');
    try {
      const results = await fetchMojeek(query);
      if (results && results.length > 0) {
        accumulatedResults = results;
        engineStats['mojeek'] = true;
      }
    } catch (e) {
      console.error('[Emergency] Falló incluso el recurso de emergencia.');
    }
  }

  const wiki = await wikiPromise;

  // PRIORIDAD DE RERANKING: Forzamos el orden de calidad
  const sourcePriority: Record<string, number> = {
    'google': 1,
    'bing': 2,
    'qwant': 3,
    'ddg': 4,
    'mojeek': 10 // Forzar Mojeek al final
  };

  const unique = new Set();
  const final = accumulatedResults
    .sort((a, b) => (sourcePriority[a.source] || 9) - (sourcePriority[b.source] || 9))
    .filter(res => {
      try {
        const host = new URL(res.url).hostname.replace('www.', '');
        if (unique.has(host)) return false;
        unique.add(host);
        res.favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
        return true;
      } catch { return false; }
    })
    .slice(0, 25);

  return { 
    results: final, 
    status: 'ok', 
    zeroClick: wiki,
    engineStats
  };
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
