/**
 * Admin Panel Proxy Page
 * Fetches PHP admin content and serves it on same port
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchAdminContent(pathSegments: string[] = []) {
  const phpServerUrl = process.env.PHP_ADMIN_URL || 'http://localhost:8080';
  const path = pathSegments.length > 0 ? pathSegments.join('/') : 'index.php';
  const url = `${phpServerUrl}/${path}`;
  
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      return {
        content: `Error: ${response.status} ${response.statusText}`,
        contentType: 'text/html',
      };
    }
    
    const content = await response.text();
    const contentType = response.headers.get('Content-Type') || 'text/html';
    
    return { content, contentType };
  } catch (error: any) {
    return {
      content: `Error loading admin panel: ${error.message}. Make sure PHP server is running on port 8080.`,
      contentType: 'text/html',
    };
  }
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams.path || [];
  
  const { content, contentType } = await fetchAdminContent(pathSegments);
  
  // Rewrite relative URLs in HTML to work with Next.js routing
  const rewrittenContent = content
    .replace(/href="([^"]+)"/g, (match, url) => {
      if (url.startsWith('http') || url.startsWith('//') || url.startsWith('/admin')) {
        return match;
      }
      if (url.startsWith('/')) {
        return `href="/admin${url}"`;
      }
      if (url.startsWith('./') || !url.includes('://')) {
        const basePath = pathSegments.length > 0 ? pathSegments.slice(0, -1).join('/') : '';
        return `href="/admin/${basePath ? basePath + '/' : ''}${url.replace('./', '')}"`;
      }
      return match;
    })
    .replace(/src="([^"]+)"/g, (match, url) => {
      if (url.startsWith('http') || url.startsWith('//') || url.startsWith('/admin')) {
        return match;
      }
      if (url.startsWith('/')) {
        return `src="/admin${url}"`;
      }
      if (url.startsWith('./') || !url.includes('://')) {
        const basePath = pathSegments.length > 0 ? pathSegments.slice(0, -1).join('/') : '';
        return `src="/admin/${basePath ? basePath + '/' : ''}${url.replace('./', '')}"`;
      }
      return match;
    })
    .replace(/action="([^"]+)"/g, (match, url) => {
      if (url.startsWith('http') || url.startsWith('//')) {
        return match;
      }
      if (url.startsWith('/')) {
        return `action="/admin${url}"`;
      }
      if (url.startsWith('./') || !url.includes('://')) {
        const basePath = pathSegments.length > 0 ? pathSegments.slice(0, -1).join('/') : '';
        return `action="/admin/${basePath ? basePath + '/' : ''}${url.replace('./', '')}"`;
      }
      return match;
    });
  
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div 
          dangerouslySetInnerHTML={{ __html: rewrittenContent }}
          style={{ 
            minHeight: '100vh',
            width: '100%',
          }}
        />
      </body>
    </html>
  );
}

