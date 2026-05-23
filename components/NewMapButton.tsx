'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// TemplatePicker bundles the full 17 KB templates dataset. Lazy-loaded so
// the dashboard doesn't ship it until someone actually clicks "New map".
const TemplatePicker = dynamic(() => import('./TemplatePicker'), {
  ssr: false,
});

type Props = {
  label?: string;
  className?: string;
};

export default function NewMapButton({
  label = '+ New map',
  className = 'btn btn-primary',
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && <TemplatePicker onClose={() => setOpen(false)} />}
    </>
  );
}
