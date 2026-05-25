import { useState, useEffect } from 'react';
import { apiGet } from '../api';

// Cache: tenant-weite Brunnentyp-Grafiken (target_key -> URL)
let cache = { data: null, promise: null, timestamp: 0 };

async function fetchGraphics() {
  const res = await apiGet('/api/graphics');
  if (!res.ok) throw new Error('graphics load failed');
  return res.json();
}

export function useGraphics() {
  const [graphics, setGraphics] = useState(cache.data || {});
  const [loading, setLoading] = useState(!cache.data);

  useEffect(() => {
    if (cache.data && Date.now() - cache.timestamp < 300000) {
      setGraphics(cache.data); setLoading(false); return;
    }
    if (!cache.promise) {
      cache.promise = fetchGraphics()
        .then((data) => { cache = { data, promise: null, timestamp: Date.now() }; return data; })
        .catch(() => { cache.promise = null; return cache.data || {}; });
    }
    cache.promise.then((data) => { setGraphics(data || {}); setLoading(false); });
  }, []);

  return { graphics, loading };
}

export function invalidateGraphicsCache() {
  cache = { data: null, promise: null, timestamp: 0 };
}
