'use client';

import { useState } from 'react';
import TemplatePicker from './TemplatePicker';

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
