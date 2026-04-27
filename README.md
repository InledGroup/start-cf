# 🚀 START SEARCH

**START SEARCH** es un motor de búsqueda minimalista, independiente y de alto rendimiento diseñado específicamente para ejecutarse en el "Edge" con **Cloudflare Workers** y **Astro**. 

Este buscador no depende de una única API comercial; en su lugar, utiliza una arquitectura de **cascada inteligente** sobre múltiples motores (DuckDuckGo, Bing y Mojeek) para garantizar resultados precisos, privados y libres de publicidad intrusiva.

## ✨ Características Principales

- 🔍 **Búsqueda Multi-Motor:** Agregación de resultados en tiempo real desde DuckDuckGo Lite, Bing y Mojeek.
- 🛡️ **Privacidad por Diseño:** Las peticiones se realizan desde el servidor (Edge), enmascarando la identidad del usuario final.
- ⚡ **Ultra Rápido:** Construido con Astro 6 para una generación de páginas estática y dinámica extremadamente ligera.
- 🖼️ **Búsqueda de Imágenes:** Interfaz avanzada con barra lateral de detalle y carga optimizada.
- 📰 **Dashboard Inteligente:** Incluye widgets de noticias (RSS configurables), clima y reloj con una estética minimalista.
- 🚫 **Ad-Free Experience:** Filtrado agresivo de resultados patrocinados y trackers.
- 🌍 **Cloudflare Native:** Optimizado para Cloudflare Pages y Workers.

## 🛠️ Tech Stack

- **Framework:** [Astro 6](https://astro.build/)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS 4
- **Parsing:** Cheerio (Scraping de alto rendimiento)
- **Despliegue:** Cloudflare Pages
- **Runtime:** Cloudflare Workers (Edge Runtime)

## 🚀 Despliegue Rápido

### Requisitos Previos
- Node.js 22 o superior.
- Una cuenta de Cloudflare.

### Instalación Local
```bash
# Clonar el repositorio
git clone git@github.com:InledGroup/start-cf.git

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

### Despliegue en Cloudflare Pages
1. Conecta este repositorio a tu panel de **Cloudflare Pages**.
2. Configura los siguientes parámetros de construcción:
   - **Framework preset:** `Astro`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Añade una variable de entorno: `NODE_VERSION = 22`.
4. ¡Listo! Cada `git push` actualizará tu buscador automáticamente.

## 🏗️ Arquitectura de Búsqueda

El núcleo del sistema reside en `src/lib/search.ts`, que implementa:
- **Jitter & UA Rotation:** Técnicas para evitar el bloqueo de motores.
- **Cascada de Fallback:** Si un motor falla o se satura, el sistema recurre automáticamente a los siguientes sin interrumpir la experiencia del usuario.
- **Normalización de URLs:** Limpieza profunda de parámetros de rastreo y redirecciones.

## 📄 Licencia

Este proyecto es propiedad de **InledGroup**. Todos los derechos reservados.

---
Desarrollado con ❤️ para una web más libre y rápida.
