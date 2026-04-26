import { Link } from 'react-router-dom';
import DocumentTemplateManager from '../components/DocumentTemplateManager';
import { withTenantContext } from '../api';

export default function AdminDocumentLayout() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            to={withTenantContext('/admin/firma')}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurueck zu den Firmendaten
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-earth-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Dokumentlayout</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Diese Seite ist bewusst vom Bereich Firmendaten getrennt. Hier arbeitet der Anwender nur am Aufbau von Angeboten und Rechnungen, ohne die übrigen Stammdaten im Blick behalten zu müssen.
          </p>
        </div>

        <DocumentTemplateManager standalone />
      </div>
    </div>
  );
}
