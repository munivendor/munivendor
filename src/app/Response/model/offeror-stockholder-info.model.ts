export interface OfferorStockholderInfo {
  stockholderId: number;
  organizationId: number | null;
  stockholderTypeId: number | null;

  // Person-specific
  firstName: string | null;
  lastName: string | null;

  // Organization-specific
  organizationName: string | null;
  publiclyTraded: boolean | null;

  // Publicly traded sub-field
  secFilingWebsite: string | null;

  // Address sub-fields (when not publicly traded)
  address: string | null;
  address2: string | null;
  city: string | null;
  stateId: string | null;
  zipCode: string | null;
  countryId: string | null;
}
