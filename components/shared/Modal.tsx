"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-surface rounded-t-card sm:rounded-card w-full max-w-[430px] max-h-[85vh] overflow-y-auto p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-[19px] text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-text hover:bg-mist transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
