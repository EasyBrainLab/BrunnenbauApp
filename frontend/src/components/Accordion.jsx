import { useState } from 'react';

export default function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-earth-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-earth-50 hover:bg-earth-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-primary-500 flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {title}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-gray-600 bg-white border-t border-earth-100">
          {children}
        </div>
      )}
    </div>
  );
}
