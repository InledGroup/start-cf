import type { APIRoute } from 'astro';

const FEEDS = [
  { name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
  { name: 'El Mundo', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml' },
  { name: 'ABC', url: 'https://www.abc.es/rss/feeds/abc_portada.xml' },
  { name: '20 Minutos', url: 'https://www.20minutos.es/rss/' },
  { name: 'El Confidencial', url: 'https://rss.elconfidencial.com/espana/' },
  { name: 'El Debate', url: 'https://www.eldebate.com/rss/home.xml' },
  { name: 'The Objective', url: 'https://theobjective.com/feed/' }
];

export const GET: APIRoute = async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 12;
  const allNews = [];

  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const xml = await response.text();
      
      // Basic XML regex parsing to avoid heavy dependencies in the worker
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      
      // Aumentamos a 30 noticias por cada feed para tener un pool grande de ~200 noticias
      for (const item of items.slice(0, 30)) {
        const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) || item.match(/<link>([\s\S]*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        
        // Image extraction - more exhaustive
        const mediaMatch = item.match(/<media:content[^>]*url="([\s\S]*?)"/) || 
                           item.match(/<enclosure[^>]*url="([\s\S]*?)"/) ||
                           item.match(/<img[^>]*src="([\s\S]*?)"/) ||
                           item.match(/<media:thumbnail[^>]*url="([\s\S]*?)"/);

        // Extract snippet/description
        const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || 
                          item.match(/<description>([\s\S]*?)<\/description>/) ||
                          item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) ||
                          item.match(/<summary>([\s\S]*?)<\/summary>/);
        
        const snippet = descMatch ? descMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .trim() : '';

        if (titleMatch && linkMatch) {
          allNews.push({
            title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
            link: linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
            image: mediaMatch ? mediaMatch[1] : null,
            snippet: snippet.substring(0, 160),
            source: feed.name,
            date: dateMatch ? new Date(dateMatch[1]).getTime() : Date.now()
          });
        }
      }
    } catch (e) {
      console.error(`Error fetching ${feed.name}:`, e);
    }
  }

  // Sort by date
  allNews.sort((a, b) => b.date - a.date);

  const start = (page - 1) * pageSize;
  const paginatedNews = allNews.slice(start, start + pageSize);

  return new Response(JSON.stringify(paginatedNews), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache 1 hour
    }
  });
};
