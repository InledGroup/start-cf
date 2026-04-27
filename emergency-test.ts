import { searchWeb } from './src/lib/search.ts';

async function finalDiagnose() {
  console.log('--- Diagnóstico de Emergencia ---');
  const query = 'noticias españa';
  try {
    const results = await searchWeb(query, 0);
    console.log(`Resultados totales: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`[${i+1}] [${r.source.toUpperCase()}] ${r.title}`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

finalDiagnose();
