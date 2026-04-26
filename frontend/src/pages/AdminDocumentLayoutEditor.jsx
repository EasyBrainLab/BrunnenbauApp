import { Link } from 'react-router-dom';
import DocumentTemplateManager from '../components/DocumentTemplateManager';
import { withTenantContext } from '../api';

export default function AdminDocumentLayoutEditor() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6">
          <Link
            to={withTenantContext('/admin/dokumentlayout')}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurueck zur Dokumentlayout-Uebersicht
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-earth-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Layout-Arbeitsplatz</h1>
          <p className="mt-2 max-w-4xl text-sm text-gray-600">
            In diesem Bereich bearbeiten Sie nur das Dokumentlayout. Die Arbeitsflaeche ist bewusst getrennt, damit der Anwender nicht parallel mit Stammdaten, Vorlagenliste und Layoutlogik belastet wird.
          </p>
        </div>

        <DocumentTemplateManager standalone workspaceMode />
      </div>
    </div>
  );
}
