import { Lock, Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Category, CategoryKind } from '@/domain/types';

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

/** Protected system kinds (Otros + debt) cannot be renamed or deleted (FR-5). */
function isProtected(kind: CategoryKind): boolean {
  return kind === 'otros' || kind === 'debt';
}

const KIND_LABEL: Record<CategoryKind, string> = {
  normal: 'Normal',
  otros: 'Sistema · Otros',
  debt: 'Sistema · Deuda',
};

/** Category table with system rows locked (§4.5). */
export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  if (categories.length === 0) {
    return <EmptyState title="Sin categorías" />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const locked = isProtected(category.kind);
                return (
                  <tr key={category.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{category.name}</span>
                        {locked ? (
                          <Lock
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-label="Categoría protegida"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {KIND_LABEL[category.kind]}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={locked}
                          onClick={() => onEdit(category)}
                          aria-label={`Editar categoría ${category.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          disabled={locked}
                          onClick={() => onDelete(category)}
                          aria-label={`Eliminar categoría ${category.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
