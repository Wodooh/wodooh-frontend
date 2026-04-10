'use client';

import { useState } from 'react';
import { useHealth } from '@/lib/hooks/use-health';

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: healthData, loading: healthLoading, isHealthy } = useHealth();

  const testLogin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@wodooh.com',
          password: 'Password123',
        }),
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testUsers = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users?page=1&limit=5`, {
        method: 'GET',
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setError(data.message || 'Fetch failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Backend API Connection Test</h1>

      {/* Health Check */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Health Check (using useHealth hook)</h2>
        {healthLoading ? (
          <p>Loading...</p>
        ) : (
          <div className={isHealthy ? 'text-green-600' : 'text-red-600'}>
            Status: {isHealthy ? '✓ Healthy' : '✗ Unhealthy'}
            <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-sm">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Manual Test Buttons */}
      <div className="space-y-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Manual API Tests</h2>
          <div className="space-x-4">
            <button
              onClick={testLogin}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test Login
            </button>
            <button
              onClick={testUsers}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Test Get Users
            </button>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="p-4 bg-blue-50 text-blue-700 rounded">Loading...</div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="p-6 bg-gray-800 text-green-400 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Result:</h3>
            <pre className="overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
