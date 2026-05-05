'use client';

export default function DeleteMapButton({ id, action }: { id: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="ml-auto">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-danger text-xs"
        onClick={(e) => { if (!confirm('Delete this mind map?')) e.preventDefault(); }}
      >
        Delete
      </button>
    </form>
  );
}
