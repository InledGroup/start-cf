# START SEARCH

![Logo](https://hosted.inled.es/start-simple-blanco-sinfondo.png)

Start Search es un metabuscador español que agrega resultados de múltiples motores de búsqueda y no depende de un api comercial como sí le pasa a DuckDuckGo, Startpage o Qwant. Al no tener una relación contractual con ninguna empresa, podemos eliminar anuncios y mejorar la experiencia de manera que el mantenimiento sale gratuito y los usuarios pueden disfrutar de un motor de búsqueda 100% independiente.

Utiliza una arquitectura de cascada sobre múltiples motores de búsqueda (DuckDuckGo, Bing, Mojeek, Qwant...) para ofrecer resultados precisos y privados, sin publicidad.  



## Características

- Búsqueda Multi-Motor: Agregado de resultados de DuckDuckGo Lite, Bing y Mojeek.
- Privacidad: Las peticiones se realizan desde el servidor (Edge), protegiendo la identidad del usuario.
- Independencia: No tenemos relación con ninguna empresa, nadie nos "vende" sus resultados de búsqueda
- Rendimiento: Construido con Astro para una experiencia veloz y lenguaje de marcado
- Funcionalidades: Incluye búsqueda de imágenes, dashboard con widgets de noticias, clima y reloj.
- Despliegue: Optimizado para Cloudflare Pages y Workers.

## Tech Stack

- Framework: Astro 6
- Lenguaje: TypeScript
- Estilos: Tailwind CSS 4
- Parsing: Cheerio
- Despliegue: Cloudflare Pages / Cloudflare Workers

## Despliegue

### Requisitos Previos

- Node.js 22+
- Cuenta de Cloudflare

### Instalación Local

```bash
git clone git@github.com:InledGroup/start-cf.git
cd start-cf
npm install
npm run dev
```

### Despliegue en Cloudflare Pages

1. Conecta el repositorio a Cloudflare Pages.
2. Configura:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Variable de entorno: `NODE_VERSION = 22`.

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar el motor de búsqueda, añadir funcionalidades o corregir errores, por favor abre un *issue* o envía un *pull request* con tus cambios.

## Licencia

MIT-INLED
