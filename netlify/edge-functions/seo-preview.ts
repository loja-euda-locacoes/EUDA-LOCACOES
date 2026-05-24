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
      // Clean trailing slashes and extract product identifier robustly
      const cleanPath = path.replace(/\/+$/, "");
      const slugOrId = decodeURIComponent(cleanPath.split("/").pop() || "");
      
      if (slugOrId) {
        try {
          let productDoc: any = null;

          // 1. First attempt: Get document by ID directly (fastest, standard REST GET)
          try {
            const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products/${slugOrId}`;
            const docRes = await fetch(docUrl);
            if (docRes.ok) {
              productDoc = await docRes.json();
            }
          } catch (e) {
            console.error("Error fetching product by ID direct REST:", e);
          }

          // 2. Second attempt: List all products and match slug/id locally (highly resilient fallback)
          if (!productDoc) {
            try {
              const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products?pageSize=200`;
              const listRes = await fetch(listUrl);
              if (listRes.ok) {
                const listData = await listRes.json();
                const docs = listData.documents || [];
                
                productDoc = docs.find((d: any) => {
                  const f = d.fields || {};
                  const docId = d.name ? d.name.split('/').pop() : '';
                  const docSlug = f.slug?.stringValue || '';
                  
                  // Handle exact or case-insensitive matches for safety
                  return docSlug === slugOrId || 
                         docSlug.toLowerCase() === slugOrId.toLowerCase() ||
                         docId === slugOrId ||
                         docId.toLowerCase() === slugOrId.toLowerCase();
                });
              }
            } catch (e) {
              console.error("Error listing documents for slug fallback search:", e);
            }
          }

          // 3. Third attempt: runQuery structured query
          if (!productDoc) {
            try {
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

              if (queryRes.ok) {
                const queryData = await queryRes.json();
                if (queryData && queryData.length > 0 && queryData[0].document) {
                  productDoc = queryData[0].document;
                }
              }
            } catch (e) {
              console.error("Error executing product runQuery:", e);
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
          console.error("Error in product extraction block:", e);
        }
      }
    }

    let html = await response.text();

    const titleEscaped = escapeHtml(title);
    const descEscaped = escapeHtml(desc);

    // Make sure image URLs are always absolute paths for crawler trust
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `https://eudalocacao.netlify.app${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    }

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
