export interface CategoryNode {
  categoryHierarchyId: number;
  name: string;
  parentId: number | null;
  deleted: boolean;
  children?: CategoryNode[];
  isEditing?: boolean;
}