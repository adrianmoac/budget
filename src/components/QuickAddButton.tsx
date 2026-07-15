import { Plus } from 'lucide-react';
import { useState } from 'react';
import { EntryForm } from '@/components/EntryForm';
import { Button } from '@/components/ui/button';

/** Opens the EntryForm modal in create mode (FR-1, dashboard §4.2). */
export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nuevo movimiento
      </Button>
      <EntryForm open={open} onOpenChange={setOpen} />
    </>
  );
}
