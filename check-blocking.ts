import * as cheerio from 'cheerio';

async function checkBlocking() {
  const query = 'noticias';
  const engines = [
    { name: 'DDG', url: `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0' },
    { name: 'Bing', url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  ];

  for (const engine of engines) {
    console.log(`\n--- Probando ${engine.name} ---`);
    try {
      const res = await fetch(engine.url, { headers: { 'User-Agent': engine.ua } });
      const html = await res.text();
      console.log(`Status: ${res.status}`);
      
      if (html.toLowerCase().includes('captcha') || html.toLowerCase().includes('robot') || html.toLowerCase().includes('challenge')) {
        console.log(`ALERTA: ${engine.name} detectó comportamiento automatizado (Bloqueo/Captcha).`);
      } else if (html.length < 500) {
        console.log(`ALERTA: ${engine.name} devolvió una respuesta sospechosamente corta (${html.length} bytes).`);
      } else {
        console.log(`${engine.name} parece haber respondido normalmente.`);
      }
    } catch (e) {
      console.error(`Error en ${engine.name}:`, e);
    }
  }
}

checkBlocking();
