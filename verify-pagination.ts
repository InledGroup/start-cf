import { searchWeb } from './src/lib/search.ts';

async function verifyPagination() {
  console.log('--- Verificando Paginación y Región España ---');
  const query = 'noticias tecnológicas';
  
  console.log('\n[Página 0]');
  const p0 = await searchWeb(query, 0);
  console.log(`P0: ${p0.length} resultados. Primero: ${p0[0]?.title}`);
  
  console.log('\nEsperando para evitar bloqueo...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('\n[Página 1]');
  const p1 = await searchWeb(query, 1);
  console.log(`P1: ${p1.length} resultados. Primero: ${p1[0]?.title}`);
  
  if (p0[0]?.url === p1[0]?.url) {
    console.error('\nERROR: La página 1 devuelve lo mismo que la página 0. La paginación falló.');
  } else {
    console.log('\nÉXITO: La paginación parece funcionar correctamente.');
  }
}

verifyPagination();
