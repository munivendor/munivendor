export interface CategoryNode {
  id: number | null;
  categoryId?: string;
  expandable?: boolean
  parentId?: number | null;
  tempParentId?: string;
  name: string;
  tempName?: string;
  deleted: boolean;
  isEditing: boolean;
  level?: number;
  children?: CategoryNode[];
  isNew?: boolean;
  isModified?: boolean;
}