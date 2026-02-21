# SEO técnico en Next.js

Next.js ofrece una serie de herramientas y características que facilitan la implementación de SEO técnico en aplicaciones web modernas. A continuación, se detallan algunas de las principales funcionalidades que ofrece:

## Metadata API

Next.js permite definir metadatos de manera sencilla utilizando la Metadata API. Esto incluye información como el título de la página, la descripción, y los metadatos de OpenGraph para optimizar la visualización en redes sociales.

**Ejemplo básico:**
```js
export const metadata = {
  title: 'Página',
  description: 'Descripción de la página',
  openGraph: {
    title: 'Título para OpenGraph',
    description: 'Descripción para OpenGraph',
    url: 'https://www.ejemplo.com',
    images: [
      {
        url: 'https://www.ejemplo.com/imagen.jpg',
        width: 800,
        height: 600,
        alt: 'Descripción de la imagen',
      },
    ],
  },
};
```

## SEO dinámico en el servidor (SSR)

El renderizado en el servidor (Server-Side Rendering o SSR) es una de las características más potentes de Next.js para SEO. Al generar las páginas en el servidor, los motores de búsqueda pueden indexar el contenido de manera más eficiente, mejorando la visibilidad en los resultados de búsqueda.

**Ventajas del SSR para SEO:**
- El contenido está disponible para los motores de búsqueda desde el momento en que se carga la página.
- Mejora el tiempo de carga percibido por los usuarios, lo que puede impactar positivamente en el ranking de búsqueda.

**Ejemplo de SSR:**
```js
import { GetServerSideProps } from 'next';

export default function Pagina({ data }) {
  return (
    <div>
      <h1>{data.titulo}</h1>
      <p>{data.descripcion}</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const data = await fetch('https://api.ejemplo.com/datos').then(res => res.json());

  return {
    props: {
      data,
    },
  };
};
```

## OpenGraph

OpenGraph es un protocolo que permite a las páginas web controlar cómo se muestran sus enlaces en redes sociales. Next.js facilita la configuración de OpenGraph mediante la Metadata API.

**Ejemplo de configuración de OpenGraph:**
```js
export const metadata = {
  openGraph: {
    title: 'Título de la página',
    description: 'Descripción breve de la página',
    url: 'https://www.ejemplo.com',
    type: 'website',
    images: [
      {
        url: 'https://www.ejemplo.com/imagen-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Texto alternativo de la imagen',
      },
    ],
  },
};
```

## Sitemap

Un sitemap es un archivo XML que ayuda a los motores de búsqueda a entender la estructura de tu sitio web. Next.js permite generar sitemaps automáticamente utilizando bibliotecas como `next-sitemap`.

**Ejemplo de configuración de next-sitemap:**
1. Instala la biblioteca:
   ```bash
   npm install next-sitemap
   ```
2. Crea un archivo `next-sitemap.config.js` en la raíz del proyecto:
   ```js
   module.exports = {
     siteUrl: 'https://www.ejemplo.com',
     generateRobotsTxt: true, // (opcional)
     sitemapSize: 7000, // Número máximo de URLs por archivo sitemap
   };
   ```
3. Agrega un script en el `package.json` para generar el sitemap:
   ```json
   "scripts": {
     "sitemap": "next-sitemap"
   }
   ```
4. Genera el sitemap:
   ```bash
   npm run sitemap
   ```

## Robots.txt

El archivo `robots.txt` indica a los motores de búsqueda qué partes de tu sitio web deben o no deben ser indexadas. Con `next-sitemap`, puedes generar este archivo automáticamente.

**Ejemplo de robots.txt generado:**
```
User-agent: *
Disallow: /admin/
Allow: /
Sitemap: https://www.ejemplo.com/sitemap.xml
```

## URLs canónicas

Las URLs canónicas ayudan a evitar contenido duplicado al indicar a los motores de búsqueda cuál es la versión principal de una página. En Next.js, puedes configurarlas fácilmente con la Metadata API.

**Ejemplo de URL canónica:**
```js
export const metadata = {
  title: 'Página Principal',
  description: 'Descripción de la página principal',
  alternates: {
    canonical: 'https://www.ejemplo.com/pagina-principal',
  },
};
```

Con estas herramientas y configuraciones, Next.js permite implementar un SEO técnico robusto y eficiente, optimizando la visibilidad de tu sitio web en los motores de búsqueda.
