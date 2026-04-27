import * as cheerio from 'cheerio';
import { searchWeb } from './src/lib/search.ts';

async function diagnoseDetailed() {
  console.log('--- Diagnóstico Detallado de Motores ---');
  const query = 'test';
  
  // Probamos DDG directamente
  console.log('\n1. Probando DuckDuckGo...');
  try {
    const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
      }
    });
    console.log(`Status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const ddgResults = $('.web-result').length;
    console.log(`Resultados DDG encontrados: ${ddgResults}`);
    if (html.includes('did not find any results') || html.includes('captcha')) {
      console.log('Aviso: DDG devolvió página de no resultados o captcha');
    }
  } catch (e) {
    console.error('Error en DDG:', e);
  }

  // Probamos Bing directamente
  console.log('\n2. Probando Bing...');
  try {
    const response = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    console.log(`Status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const bingResults = $('h2 a').length;
    console.log(`Resultados Bing encontrados (h2 a): ${bingResults}`);
  } catch (e) {
    console.error('Error en Bing:', e);
  }

  // Probamos Mojeek directamente
  console.log('\n3. Probando Mojeek (Fallback)...');
  try {
    const res = await fetch(`https://www.mojeek.com/search?q=${encodeURIComponent(query)}`);
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const mojeekResults = $('.results-standard > li').length;
    console.log(`Resultados Mojeek encontrados: ${mojeekResults}`);
  } catch (e) {
    console.error('Error en Mojeek:', e);
  }
}

diagnoseDetailed();
