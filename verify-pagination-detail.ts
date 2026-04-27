import { searchWeb } from './src/lib/search.ts';

async function verifyPaginationDetail() {
  console.log('--- Diagnóstico Detallado de Paginación ---');
  const query = 'noticias del día';
  
  const results = [];
  for (let p = 0; p < 2; p++) {
    console.log(`\nSolicitando página ${p}...`);
    const res = await searchWeb(query, p);
    results.push(res);
    console.log(`P${p}: ${res.length} resultados.`);
    res.slice(0, 3).forEach(r => console.log(` - [${r.source}] ${r.title}`));
    await new Promise(r => setTimeout(r, 2000));
  }
  
  const urls0 = new Set(results[0].map(r => r.url));
  const overlap = results[1].filter(r => urls0.has(r.url));
  
  console.log(`\nSolapamiento: ${overlap.length} de ${results[1].length} resultados son idénticos.`);
  
  if (overlap.length > results[1].length * 0.5) {
    console.error('ERROR: Demasiados duplicados. La paginación no está funcionando.');
  } else {
    console.log('ÉXITO: La mayoría de los resultados son nuevos.');
  }
}

verifyPaginationDetail();
