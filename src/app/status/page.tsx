'use client';

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  build: number;
  deployedAt: string;
  commit: string;
}

interface ApiStatus {
  name: string;
  url: string;
  status: 'checking' | 'ok' | 'error';
  message?: string;
}

export default function StatusPage() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [apis, setApis] = useState<ApiStatus[]>([
    { name: 'Products API', url: '/admin/api/products.php', status: 'checking' },
    { name: 'Categories API', url: '/admin/api/categories.php', status: 'checking' },
    { name: 'Upload API', url: '/admin/api/upload.php', status: 'checking' },
    { name: 'Auth API', url: '/admin/api/auth.php', status: 'checking' },
  ]);

  useEffect(() => {
    // Fetch version info
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(() => setVersion(null));

    // Check each API endpoint
    apis.forEach((api, index) => {
      const method = api.url.includes('upload') ? 'POST' : 'GET';
      fetch(api.url, { method: method === 'POST' ? 'OPTIONS' : 'GET' })
        .then(res => {
          setApis(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              status: res.status === 404 ? 'error' : 'ok',
              message: res.status === 404 ? '404 Not Found' : `${res.status} OK`,
            };
            return updated;
          });
        })
        .catch(err => {
          setApis(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              status: 'error',
              message: err.message,
            };
            return updated;
          });
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Site Status</h1>

        {/* Version Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Deployment Info</h2>
          {version ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-500">Version</dt>
              <dd className="font-mono">{version.version}</dd>
              <dt className="text-gray-500">Build</dt>
              <dd className="font-mono">#{version.build}</dd>
              <dt className="text-gray-500">Deployed</dt>
              <dd className="font-mono">{version.deployedAt}</dd>
              <dt className="text-gray-500">Commit</dt>
              <dd className="font-mono">{version.commit}</dd>
            </dl>
          ) : (
            <p className="text-gray-400">version.json not found</p>
          )}
        </div>

        {/* API Health Checks */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">API Endpoints</h2>
          <div className="space-y-3">
            {apis.map((api) => (
              <div key={api.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{api.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{api.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                    api.status === 'checking' ? 'bg-yellow-400 animate-pulse' :
                    api.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-xs font-mono ${
                    api.status === 'ok' ? 'text-green-600' :
                    api.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {api.status === 'checking' ? 'Checking...' : api.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
