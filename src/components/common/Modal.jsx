import React from 'react';

export function Modal({ title, children, onClose, footer }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="modal-title" className="text-base font-bold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4 text-sm text-gray-800">{children}</div>
        {footer ? <div className="border-t border-gray-200 px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
