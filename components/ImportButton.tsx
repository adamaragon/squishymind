'use client';

import { useState } from 'react';
import ImportDialog from './ImportDialog';

export default function ImportButton({
  label = 'Import',
  className = 'btn btn-ghost',
}: {
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && <ImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}
