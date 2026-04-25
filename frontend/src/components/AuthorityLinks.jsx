import { useState, useEffect } from 'react';
import { apiGet } from '../api';

export default function AuthorityLinks({ bundesland }) {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!bundesland) return;
    apiGet(`/api/authority-links?bundesland=${encodeURIComponent(bundesland)}`)
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data) => setLinks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [bundesland]);

  if (!bundesland || links.length === 0) return null;

  const typeLabels = {
    anzeige: 'Brunnenanzeige',
    genehmigung: 'Genehmigung',
    wasserrecht: 'Wasserrecht',
    info: 'Information',
    formular: 'Formular',
  };

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Behoerdliche Informationen fuer {bundesland}
      </h3>
      <p className="text-xs text-blue-600 mb-3">
        Je nach Standort kann eine Brunnenanzeige oder Genehmigung erforderlich sein. Hier finden Sie die relevanten Links:
      </p>
      <div className="space-y-2">
        {links.map(link => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 whitespace-nowrap mt-0.5">
              {typeLabels[link.link_type] || link.link_type}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900">{link.title}</p>
              {link.description && <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>}
              <p className="text-xs text-blue-500 mt-0.5 truncate">{link.url}</p>
            </div>
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
