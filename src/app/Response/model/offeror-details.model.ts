export interface OfferorDetails {
  organizationId?: number;
  organizationName: string;
  address: string;
  address2?: string | null;
  city: string;
  stateId: number | null;
  country?: number | null;
  zipCode: string;
  dateOfIncorporation?: string | null;
  // entityType is actually organizationSubTypeId in the backend
  organizationSubTypeId?: number | null;
  timeAtCurrentAddress?: number | null;
  taxId: string;
  phone: string;
  fax?: string | null;
}
