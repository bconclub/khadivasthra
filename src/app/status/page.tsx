'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'checking' | 'ok' | 'error';
  message?: string;
}

export default function StatusPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: 'Supabase Connection', status: 'checking' },
    { name: 'Products Table', status: 'checking' },
    { name: 'Categories Table', status: 'checking' },
    { name: 'Orders Table', status: 'checking' },
    { name: 'Settings Table', status: 'checking' },
  ]);

  useEffect(() => {
    async function runChecks() {
      const results: HealthCheck[] = [];

      // Check Supabase connection
      try {
        const { error } = await supabase.from('categories').select('id', { count: 'exact', head: true });
        results.push({
          name: 'Supabase Connection',
          status: error ? 'error' : 'ok',
          message: error ? error.message : 'Connected',
        });
      } catch (err) {
        results.push({
          name: 'Supabase Connection',
          status: 'error',
          message: err instanceof Error ? err.message : 'Connection failed',
        });
      }

      // Check each table
      const tables = [
        { name: 'Products Table', table: 'products' },
        { name: 'Categories Table', table: 'categories' },
        { name: 'Orders Table', table: 'orders' },
        { name: 'Settings Table', table: 'settings' },
      ];

      for (const { name, table } of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          results.push({
            name,
            status: error ? 'error' : 'ok',
            message: error ? error.message : `${count ?? 0} rows`,
          });
        } catch (err) {
          results.push({
            name,
            status: 'error',
            message: err instanceof Error ? err.message : 'Query failed',
          });
        }
      }

      setChecks(results);
    }

    runChecks();
  }, []);

  const allOk = checks.every(c => c.status === 'ok');
  const anyChecking = checks.some(c => c.status === 'checking');

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-text font-serif">Site Status</h1>
        <p className="text-text-muted mb-8">Khadi Vasthra &mdash; Backend Health</p>

        {/* Overall Status */}
        <div className={`rounded-xl p-6 mb-6 border ${
          anyChecking ? 'bg-yellow-50 border-yellow-200' :
          allOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {anyChecking ? (
              <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
            ) : allOk ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <span className="font-semibold text-lg text-text">
              {anyChecking ? 'Checking...' : allOk ? 'All Systems Operational' : 'Some Issues Detected'}
            </span>
          </div>
        </div>

        {/* Individual Checks */}
        <div className="bg-white rounded-xl shadow-sm border border-cream/30 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-text">Supabase Backend</h2>
            <div className="space-y-3">
              {checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between py-3 border-b border-cream/30 last:border-0">
                  <span className="font-medium text-sm text-text">{check.name}</span>
                  <div className="flex items-center gap-2">
                    {check.status === 'checking' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                    ) : check.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs font-mono ${
                      check.status === 'ok' ? 'text-green-600' :
                      check.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {check.status === 'checking' ? 'Checking...' : check.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
