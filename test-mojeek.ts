import * as cheerio from 'cheerio';

async function testMojeek() {
  const query = 'inled';
  const url = `https://www.mojeek.com/search?q=${encodeURIComponent(query)}`;
  console.log('Fetching:', url);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  console.log('Status:', res.status);
  const html = await res.text();
  console.log('HTML Length:', html.length);
  
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('.results-standard > li').each((_, el) => {
    const a = $(el).find('a.title');
    results.push({
      title: a.text().trim(),
      url: a.attr('href')
    });
  });
  
  console.log('Results found:', results.length);
  results.forEach((r, i) => console.log(`${i+1}. ${r.title}`));
}

testMojeek();
