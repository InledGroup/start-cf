
async function testWikiFull() {
  const query = 'VOX';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'es-ES,es;q=0.9'
  };

  console.log(`--- Test Wikipedia/Wikidata para: ${query} ---`);

  try {
    // 1. Wikipedia Summary
    const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { headers });
    const data = await res.json();
    console.log(`1. Wikipedia OK: ${data.title}`);

    // 2. ID Wikidata
    const propRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(data.title)}&format=json&origin=*`, { headers });
    const propData = await propRes.json();
    const pageId = Object.keys(propData.query.pages)[0];
    const wikibaseId = propData.query.pages[pageId].pageprops?.wikibase_item;
    console.log(`2. Wikidata ID: ${wikibaseId}`);

    if (wikibaseId) {
      // 3. P856
      const wdRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikibaseId}&props=claims&format=json&origin=*`, { headers });
      const wdData = await wdRes.json();
      const claims = wdData.entities[wikibaseId].claims;
      const official = claims.P856?.[0]?.mainsnak?.datavalue?.value;
      console.log(`3. Sitio Oficial: ${official || 'NO ENCONTRADO'}`);
    }
  } catch (e) {
    console.error('ERROR:', e);
  }
}

testWikiFull();
