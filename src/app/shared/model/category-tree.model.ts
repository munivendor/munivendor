export interface CategoryNode {
  id: number | null;
  name: string;
  tempName?: string;
  deleted: boolean;
  isEditing: boolean;
  level?: number;
  children?: CategoryNode[];
}