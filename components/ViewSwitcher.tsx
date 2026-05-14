'use client';

import type { ViewMode } from '@/lib/types';

const VIEWS: Array<{
  id: ViewMode;
  label: string;
  icon: string;
  comingSoon?: boolean;
}> = [
  { id: 'canvas', label: 'Canvas', icon: '🧠' },
  { id: 'outline', label: 'Outline', icon: '📝' },
  { id: 'tree', label: 'Tree', icon: '🌳' },
  { id: 'table', label: 'Table', icon: '📊', comingSoon: true },
];

type Props = {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export default function ViewSwitcher({ current, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg border border-white/10 overflow-hidden text-xs shrink-0"
      role="group"
      aria-label="View mode"
    >
      {VIEWS.map((v) => {
        const isActive = current === v.id;
        const disabled = !!v.comingSoon;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => !disabled && onChange(v.id)}
            disabled={disabled}
            title={disabled ? `${v.label} view — coming soon` : `Switch to ${v.label.toLowerCase()} view`}
            aria-pressed={isActive}
            className={[
              'px-2.5 py-1.5 flex items-center gap-1.5 transition-colors',
              isActive
                ? 'bg-white/10 text-white'
                : disabled
                  ? 'text-[--text-dim]/40 cursor-not-allowed'
                  : 'text-[--text-dim] hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            <span aria-hidden>{v.icon}</span>
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
