import { searchWeb } from './src/lib/search.ts';

async function diagnose() {
  console.log('--- Iniciando diagnóstico de búsqueda ---');
  const query = 'noticias';
  console.log(`Buscando: "${query}"...`);
  
  try {
    const results = await searchWeb(query);
    console.log(`Resultados encontrados: ${results.length}`);
    
    if (results.length > 0) {
      console.log('Primer resultado:', results[0]);
    } else {
      console.error('ERROR: No se devolvieron resultados.');
    }
  } catch (error) {
    console.error('ERROR CRÍTICO durante la ejecución:', error);
  }
}

diagnose();
