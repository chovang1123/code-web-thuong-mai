export interface CategoryDefinition {
  name: string;
  slug: string;
  parentSlug: string | null;
  sortOrder: number;
  isVisible: boolean;
  isArchived: boolean;
}
export const categoryDefinitions: CategoryDefinition[];
export function resolveCategory(value?: string): CategoryDefinition | undefined;
export function categoryPath(value?: string): CategoryDefinition[];
export function filterFields(value?: string): { gender: boolean; brand: boolean; os: boolean };
