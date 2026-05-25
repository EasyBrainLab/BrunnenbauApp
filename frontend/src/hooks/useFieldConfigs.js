import { useState, useEffect } from 'react';
import { apiGet } from '../api';

// Cache: tenant-weite Feldkonfiguration (alle auf einmal geladen)
let cache = { data: null, promise: null, timestamp: 0 };

async function fetchConfigs() {
  const res = await apiGet('/api/field-configs');
  if (!res.ok) throw new Error('field-configs load failed');
  return res.json();
}

export function useFieldConfigs() {
  const [configs, setConfigs] = useState(cache.data || {});
  const [loading, setLoading] = useState(!cache.data);

  useEffect(() => {
    if (cache.data && Date.now() - cache.timestamp < 300000) {
      setConfigs(cache.data);
      setLoading(false);
      return;
    }
    if (!cache.promise) {
      cache.promise = fetchConfigs()
        .then((data) => { cache = { data, promise: null, timestamp: Date.now() }; return data; })
        .catch(() => { cache.promise = null; return cache.data || {}; });
    }
    cache.promise.then((data) => { setConfigs(data || {}); setLoading(false); });
  }, []);

  return { configs, loading };
}

export function invalidateFieldConfigsCache() {
  cache = { data: null, promise: null, timestamp: 0 };
}
