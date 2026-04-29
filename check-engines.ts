import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
];

function getHeaders() {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  };
}

interface EngineResult {
  engine: string;
  status: 'OK' | 'BLOCKED' | 'ERROR';
  details: string;
  count: number;
  responseTime: number;
}

async function testEngine(name: string, url: string, selector: string): Promise<EngineResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: getHeaders() });
    const responseTime = Date.now() - start;
    
    if (res.status === 403 || res.status === 429) {
      return { engine: name, status: 'BLOCKED', details: `HTTP ${res.status}`, count: 0, responseTime };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Debug: Si no hay resultados, ver qué hay
    const bodyText = $('body').text().toLowerCase();

    const blockSignals = [
      'detected unusual traffic',
      'captcha-delivery',
      'robot',
      'security challenge',
      'content="0;url=/sorry/',
      'nuestro sistema ha detectado'
    ];

    for (const signal of blockSignals) {
      if (html.toLowerCase().includes(signal)) {
        return { engine: name, status: 'BLOCKED', details: `Bot detected (${signal})`, count: 0, responseTime };
      }
    }

    const elements = $(selector);
    let count = elements.length;
    
    // Lógica especial para Google GBV=1
    if (name.includes('Google') && count === 0) {
      count = $('h3').length; // En GBV=1 los títulos suelen ser h3
    }

    if (count === 0) {
      if (html.length < 1000) {
        return { engine: name, status: 'ERROR', details: 'Respuesta muy corta o vacía', count: 0, responseTime };
      }
      return { engine: name, status: 'OK', details: 'Sin resultados visibles (posible cambio de UI)', count: 0, responseTime };
    }

    // Análisis de calidad (enfocado en España)
    let spanishScore = 0;
    elements.each((_, el) => {
      const text = $(el).text().toLowerCase();
      const link = $(el).find('a').attr('href') || '';
      if (link.includes('.es/') || link.endsWith('.es')) spanishScore++;
      if (text.includes('españa') || text.includes('receta')) spanishScore++;
    });

    return { 
      engine: name, 
      status: 'OK', 
      details: `Calidad ES: ${Math.round((spanishScore/count)*100)}%`, 
      count: count, 
      responseTime 
    };
  } catch (e: any) {
    return { engine: name, status: 'ERROR', details: e.message, count: 0, responseTime: Date.now() - start };
  }
}

async function runAudit() {
  const query = 'receta de tortilla de patatas'; // Spanish query
  console.log(`\n🔍 Auditoría de Motores de Búsqueda`);
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`🔎 Consulta: "${query}"\n`);

  const engines = [
    { 
      name: 'Google (ES)', 
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}&gbv=1&lr=lang_es&cr=countryES&gl=es`, 
      selector: 'div.g, .ZINbbc, .Gx5Z7d' 
    },
    { 
      name: 'Bing (ES)', 
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=ES&setlang=es`, 
      selector: '.b_algo, .b_result' 
    },
    { 
      name: 'DuckDuckGo Lite', 
      url: `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=es-es`, 
      selector: 'a.result-link, .result-link' 
    },
    { 
      name: 'Mojeek', 
      url: `https://www.mojeek.com/search?q=${encodeURIComponent(query)}&lb=es`, 
      selector: '.results-standard > li, .results > li' 
    },
    { 
      name: 'Marginalia', 
      url: `https://search.marginalia.nu/search?query=${encodeURIComponent(query)}`, 
      selector: 'section.search-result' 
    },
    { 
      name: 'Ecosia (ES)', 
      url: `https://www.ecosia.org/search?q=${encodeURIComponent(query)}&addon=es`, 
      selector: '.mainline-results .result, .card-web' 
    },
    { 
      name: 'Qwant (ES)', 
      url: `https://www.qwant.com/lite/?q=${encodeURIComponent(query)}&t=web&l=es_es`, 
      selector: '.result-container' 
    }
  ];

  const results: EngineResult[] = [];

  for (const engine of engines) {
    process.stdout.write(`Testing ${engine.name}... `);
    const result = await testEngine(engine.name, engine.url, engine.selector);
    results.push(result);
    console.log(result.status === 'OK' ? `✅ (${result.responseTime}ms)` : `❌ ${result.details}`);
  }

  console.log('\n--- RESUMEN FINAL ---');
  console.table(results.map(r => ({
    Motor: r.engine,
    Estado: r.status,
    Resultados: r.count,
    'Tiempo (ms)': r.responseTime,
    Detalles: r.details
  })));

  const working = results.filter(r => r.status === 'OK');
  const blocked = results.filter(r => r.status === 'BLOCKED');

  console.log(`\n✅ Operativos: ${working.length}`);
  console.log(`🚫 Bloqueados: ${blocked.length}`);
  
  if (working.length > 0) {
    console.log('\n💡 RECOMENDACIÓN:');
    const priority = working.sort((a, b) => b.count - a.count);
    console.log(`- Principal: ${priority[0].engine} (Mejor calidad/cantidad)`);
    if (priority.length > 1) {
      console.log(`- Respaldo: ${priority[1].engine}`);
    }
  }
}

runAudit();
