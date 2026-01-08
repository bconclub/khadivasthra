/**
 * Next.js API Route to proxy admin PHP API requests
 * This allows /admin/api/* requests to work through Next.js
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams);
}

async function proxyRequest(request: Request, params: { path: string[] }) {
  const phpServerUrl = process.env.PHP_ADMIN_URL || 'http://localhost:8080';
  
  // Get path array from params
  const pathArray = Array.isArray(params.path) ? params.path : [];
  const apiPath = pathArray.length > 0 ? pathArray.join('/') : '';
  const url = `${phpServerUrl}/api/${apiPath}`;
  
  console.log('Proxy request:', { method: request.method, path: pathArray, url });
  
  // Get request body if it exists
  let body: BodyInit | null = null;
  const contentType = request.headers.get('content-type') || '';
  
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const formData = await request.formData();
      const urlParams = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        urlParams.append(key, value.toString());
      }
      body = urlParams.toString();
    } catch (e) {
      // If formData fails, try text
      try {
        body = await request.text();
      } catch {
        body = null;
      }
    }
  }
  
  // Forward the request to PHP server
  const init: RequestInit = {
    method: request.method,
  };
  
  if (body) {
    init.body = body;
    init.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }
  
  try {
    console.log('Fetching PHP server:', url, { method: request.method, hasBody: !!body });
    const response = await fetch(url, init);
    const data = await response.text();
    
    console.log('PHP response:', { status: response.status, dataLength: data.length });
    
    // Get content type from PHP response
    const responseContentType = response.headers.get('Content-Type') || 'application/json';
    
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': responseContentType,
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Failed to connect to admin server: ${error?.message || 'Unknown error'}. Make sure PHP server is running on port 8080.` 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

