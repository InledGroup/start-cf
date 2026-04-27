import { searchWeb } from './src/lib/search.ts';

async function verify() {
  console.log('--- Verificando motores (DDG, Bing, Mojeek) ---');
  const query = 'inled';
  
  try {
    const response = await searchWeb(query);
    const results = response.results;
    console.log(`Estado: ${response.status}`);
    console.log(`Total resultados: ${results?.length || 0}`);
    
    if (results && results.length > 0) {
      const sources = results.reduce((acc: any, res: any) => {
        acc[res.source] = (acc[res.source] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Distribución por fuentes:', sources);
      
      console.log('\nEjemplos:');
      results.slice(0, 5).forEach((r: any, i: number) => {
        console.log(`${i+1}. [${r.source.toUpperCase()}] ${r.title} - ${r.url.substring(0, 50)}...`);
      });
    } else {
      console.error('ERROR: No se recuperaron resultados.');
    }
  } catch (error) {
    console.error('FALLO CRÍTICO:', error);
  }
}

verify();
