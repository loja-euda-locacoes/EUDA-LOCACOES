import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  async function getProduct(idOrSlug: string) {
    try {
      const queryUrl = `https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-e739d/databases/ai-studio-b7778001-cf63-4b71-8a8b-c7f50096fb15/documents:runQuery`;
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'products' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: idOrSlug }
              }
            },
            limit: 1
          }
        })
      });

      if (response.ok) {
        const results = await response.json() as any[];
        if (results && results.length > 0 && results[0].document) {
          const doc = results[0].document;
          return parseFirestoreDoc(doc);
        }
      }
    } catch (err) {
      console.error("Error querying by slug:", err);
    }

    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-e739d/databases/ai-studio-b7778001-cf63-4b71-8a8b-c7f50096fb15/documents/products/${idOrSlug}`;
      const response = await fetch(docUrl);
      if (response.ok) {
        const doc = await response.json();
        return parseFirestoreDoc(doc);
      }
    } catch (err) {
      console.error("Error fetching by ID:", err);
    }

    return null;
  }

  function parseFirestoreDoc(doc: any) {
    const fields = doc.fields || {};
    const name = fields.name?.stringValue || '';
    const description = fields.description?.stringValue || '';
    const slug = fields.slug?.stringValue || '';
    const mainImage = fields.mainImage?.stringValue || '';
    
    let images: string[] = [];
    if (fields.images?.arrayValue?.values) {
      images = fields.images.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
    }

    return {
      id: doc.name ? doc.name.split('/').pop() : '',
      name,
      description,
      slug,
      mainImage,
      images
    };
  }

  function getDriveDirectLinkServer(url: string | undefined): string {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;

    const regex = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    const driveId = match ? (match[1] || match[2]) : null;

    if (driveId) {
      return `https://lh3.googleusercontent.com/u/0/d/${driveId}`;
    }
    
    return url;
  }

  function escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function replaceMetaTag(html: string, propertyOrName: string, content: string): string {
    const regex = new RegExp(`(<meta[^>]*(?:property|name)=["']${propertyOrName}["'][^>]*content=["'])([^"']*)(["'][^>]*>)`, 'i');
    if (regex.test(html)) {
      return html.replace(regex, `$1${content}$3`);
    }
    return html.replace('<head>', `<head>\n    <meta property="${propertyOrName}" content="${content}" />`);
  }

  // Handle fallback replacing simple <meta property="..."> or <meta name="..."> even if attributes are reordered
  function replaceMetaTagAgnostic(html: string, identifier: string, content: string): string {
    // Attempt standard replace first
    let result = replaceMetaTag(html, identifier, content);
    if (result !== html) return result;

    // Fallback regex to capture reordered parameters
    const regexFallback = new RegExp(`(<meta[^>]*content=["'])([^"']*)(["'][^>]*(?:property|name)=["']${identifier}["'][^>]*>)`, 'i');
    if (regexFallback.test(html)) {
      return html.replace(regexFallback, `$1${content}$3`);
    }
    return html.replace('<head>', `<head>\n    <meta property="${identifier}" content="${content}" />`);
  }

  function replaceTitle(html: string, title: string): string {
    const regex = /<title>[^<]*<\/title>/i;
    if (regex.test(html)) {
      return html.replace(regex, `<title>${title}</title>`);
    }
    return html.replace('<head>', `<head>\n    <title>${title}</title>`);
  }

  function injectProductMeta(html: string, product: any, req: express.Request): string {
    const nameEscaped = escapeHtml(product.name);
    const descEscaped = escapeHtml(product.description || "Aluguel de vestidos juninos profissionais em Icó-CE. Coleção exclusiva com tradição e elegância.");
    const imageUrl = getDriveDirectLinkServer(product.mainImage || product.images[0]);

    let modifiedHtml = html;
    modifiedHtml = replaceTitle(modifiedHtml, `${nameEscaped} | Euda Aluguéis`);
    modifiedHtml = replaceMetaTagAgnostic(modifiedHtml, 'description', descEscaped);
    modifiedHtml = replaceMetaTagAgnostic(modifiedHtml, 'og:title', `${nameEscaped} | Euda Aluguéis`);
    modifiedHtml = replaceMetaTagAgnostic(modifiedHtml, 'og:description', descEscaped);
    if (imageUrl) {
      modifiedHtml = replaceMetaTagAgnostic(modifiedHtml, 'og:image', imageUrl);
      modifiedHtml = replaceMetaTagAgnostic(modifiedHtml, 'twitter:image', imageUrl);
    }
    modifiedHtml = replaceMetaTagAgnostic(modifiedHtml, 'og:url', `https://${req.get('host') || 'eudalocacao.netlify.app'}${req.originalUrl}`);
    return modifiedHtml;
  }

  // Intercept product page requests to inject metadata for crawler social sharing preview
  app.get('/produto/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const product = await getProduct(id);
      
      let htmlPath = '';
      if (process.env.NODE_ENV === 'production') {
        htmlPath = path.resolve(process.cwd(), 'dist', 'index.html');
      } else {
        htmlPath = path.resolve(process.cwd(), 'index.html');
      }

      if (!fs.existsSync(htmlPath)) {
        return next();
      }

      let html = await fs.promises.readFile(htmlPath, 'utf-8');

      if (product) {
        html = injectProductMeta(html, product, req);
      }

      if (process.env.NODE_ENV !== 'production') {
        if (viteServer) {
          html = await viteServer.transformIndexHtml(req.originalUrl, html);
        }
      }

      return res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (err) {
      console.error("Error in product server-side preview handler:", err);
      return next();
    }
  });

  let viteServer: any = null;

  if (process.env.NODE_ENV !== 'production') {
    viteServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
