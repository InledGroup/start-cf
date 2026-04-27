import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:145.0) Gecko/20100101 Firefox/145.0'
];

function getRandomHeaders(referer: string) {
  return {
    'User-Agent': USER_AGENTS[0],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': referer,
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
}

async function testEngine(name: string, url: string, headers: any) {
  console.log(`\n--- Probando ${name} ---`);
  try {
    const res = await fetch(url, { headers });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const html = await res.text();
    console.log(`Tamaño HTML: ${html.length} bytes`);
    
    if (html.includes('bot') || html.includes('captcha') || html.includes('challenge')) {
      console.log(`❌ BLOQUEADO: Detectado como bot/captcha`);
    } else if (html.length < 5000) {
      console.log(`⚠️ POSIBLE BLOQUEO: HTML muy pequeño`);
      if (html.length < 1000) console.log(`Contenido: ${html.substring(0, 500)}`);
    } else {
      console.log(`✅ PARECE OK: HTML de buen tamaño`);
    }
  } catch (e: any) {
    console.log(`❌ ERROR CRÍTICO: ${e.message}`);
  }
}

async function runAll() {
  const q = 'madrid';
  
  // 1. DDG Lite
  await testEngine('DDG Lite', `https://lite.duckduckgo.com/lite/?q=${q}&kl=es-es`, getRandomHeaders('https://duckduckgo.com/'));
  
  // 2. Bing
  await testEngine('Bing', `https://www.bing.com/search?q=${q}&cc=ES`, getRandomHeaders('https://www.bing.com/'));
  
  // 3. Brave
  await testEngine('Brave', `https://search.brave.com/search?q=${q}`, getRandomHeaders('https://search.brave.com/'));
  
  // 4. Qwant
  await testEngine('Qwant API', `https://api.qwant.com/v3/search/web?q=${q}&count=10&locale=es_ES&t=web`, getRandomHeaders('https://www.qwant.com/'));

  // 5. Swisscows
  await testEngine('Swisscows', `https://swisscows.com/web?query=${q}`, getRandomHeaders('https://swisscows.com/'));
  
  // 6. Google
  await testEngine('Google', `https://www.google.com/search?q=${q}&hl=es`, getRandomHeaders('https://www.google.com/'));
}

runAll();
