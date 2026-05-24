import type { Context } from "https://edge.netlify.com";

// Helper to convert Google Drive sharing link to direct high-res image link
function getDriveDirectLinkServer(url: string | undefined): string {
  if (!url) return '';
  if (!url.includes('drive.google.com')) return url;

  const regex = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  const driveId = match ? (match[1] || match[2]) : null;

  if (driveId) {
    // lh3 is standard high-quality CDN link for Google Drive files
    return `https://lh3.googleusercontent.com/d/${driveId}`;
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

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Fetch the default response from Netlify's origin
  const response = await context.next();
  
  // Only parse and rewrite HTML files
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  try {
    let title = "Euda Aluguéis | Catálogo de Vestidos Juninos";
    let desc = "Aluguel de vestidos juninos profissionais em Icó-CE. Coleção exclusiva com tradição e elegância.";
    let imageUrl = "https://eudalocacao.netlify.app/logo.png"; // Absolute production static logo path

    const projectId = "ai-studio-applet-webapp-e739d";
    const databaseId = "ai-studio-b7778001-cf63-4b71-8a8b-c7f50096fb15";

    // Detect if we are loading homepage
    if (path === "/" || path === "") {
      try {
        const settingsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/settings/global`;
        const res = await fetch(settingsUrl);
        if (res.ok) {
          const settingsDoc = await res.json();
          const fields = settingsDoc.fields || {};
          const storeName = fields.storeName?.stringValue || "Euda Aluguéis";
          const impactPhrase = fields.impactPhrase?.stringValue || "Catálogo de Vestidos Juninos";
          const logoUrl = fields.logoUrl?.stringValue || "";
          
          title = `${storeName} | ${impactPhrase}`;
          desc = fields.address?.stringValue 
            ? `Aluguel de vestidos profissionais em Icó-CE. Localizado em: ${fields.address?.stringValue}`
            : "Aluguel de vestidos juninos profissionais em Icó-CE. Coleção exclusiva com tradição e elegância.";
          if (logoUrl) {
            imageUrl = getDriveDirectLinkServer(logoUrl);
          }
        }
      } catch (e) {
        console.error("Error fetching settings in edge function:", e);
      }
    } 
    // Detect if we are loading a product detail page
    else if (path.startsWith("/produto/")) {
      const slugOrId = path.split("/").pop() || "";
      if (slugOrId) {
        try {
          // 1. Query by unique slug
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
          const queryRes = await fetch(queryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'products' }],
                where: {
                  fieldFilter: {
                    field: { fieldPath: 'slug' },
                    op: 'EQUAL',
                    value: { stringValue: slugOrId }
                  }
                },
                limit: 1
              }
            })
          });

          let productDoc: any = null;

          if (queryRes.ok) {
            const queryData = await queryRes.json();
            if (queryData && queryData.length > 0 && queryData[0].document) {
              productDoc = queryData[0].document;
            }
          }

          // 2. Fallback to get by Document ID directly
          if (!productDoc) {
            const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products/${slugOrId}`;
            const docRes = await fetch(docUrl);
            if (docRes.ok) {
              productDoc = await docRes.json();
            }
          }

          if (productDoc) {
            const fields = productDoc.fields || {};
            const name = fields.name?.stringValue || '';
            const description = fields.description?.stringValue || '';
            const mainImage = fields.mainImage?.stringValue || '';
            let firstImg = '';
            if (fields.images?.arrayValue?.values && fields.images.arrayValue.values.length > 0) {
              firstImg = fields.images.arrayValue.values[0].stringValue || '';
            }

            title = `${name} | Euda Aluguéis`;
            if (description) {
              desc = description;
            }
            const rawImg = mainImage || firstImg;
            if (rawImg) {
              imageUrl = getDriveDirectLinkServer(rawImg);
            }
          }
        } catch (e) {
          console.error("Error fetching product in edge function:", e);
        }
      }
    }

    let html = await response.text();

    const titleEscaped = escapeHtml(title);
    const descEscaped = escapeHtml(desc);

    // Replace <title> and other tag definitions dynamically
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${titleEscaped}</title>`);
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']/i, `<meta name="description" content="${descEscaped}"`);
    html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']/i, `<meta property="og:title" content="${titleEscaped}"`);
    html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']/i, `<meta property="og:description" content="${descEscaped}"`);
    html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'][^"']*["']/i, `<meta property="og:image" content="${imageUrl}"`);
    html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']/i, `<meta name="twitter:image" content="${imageUrl}"`);

    const fullUrl = request.url;
    html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']/i, `<meta property="og:url" content="${fullUrl}"`);

    return new Response(html, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });

  } catch (err) {
    console.error("SEO rewrite error, falling back to original html:", err);
    return response;
  }
};
