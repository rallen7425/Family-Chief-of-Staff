"use client";

import { PartyPopper } from "lucide-react";

interface CelebrationModalProps {
  message: string | null;
  onClose: () => void;
}

/** Fires right after a chore completion that crossed a streak or points
 * milestone — see lib/chores.ts crossedMilestone/celebrationMessage. Modal
 * only, not a route. */
export function CelebrationModal({ message, onClose }: CelebrationModalProps) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-surface rounded-card max-w-[340px] w-full p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
      >
        <div className="w-16 h-16 rounded-full bg-accent-gold/15 flex items-center justify-center mx-auto mb-4">
          <PartyPopper size={30} className="text-accent-gold" />
        </div>
        <h2 className="font-display font-semibold text-[20px] text-ink mb-1.5">Nice work!</h2>
        <p className="text-[14px] text-muted-text mb-6">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-pill bg-primary text-white text-[15px] font-semibold hover:bg-primary-hover transition-colors"
        >
          Keep going
        </button>
      </div>
    </div>
  );
}
