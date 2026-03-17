export interface OfferorDetails {
  organizationId?: number;
  organizationName: string;
  address: string;
  address2?: string | null;
  city: string;
  stateId: number | null;
  country?: string | null;
  zipCode: string;
  incorporationDate?: string | null;
  entityType?: string | null;
  timeAtAddress?: string | null;
  taxId: string;
  phone: string;
  fax?: string | null;
}
