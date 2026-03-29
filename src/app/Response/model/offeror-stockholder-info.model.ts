export interface OfferorStockholderInfo {
  offerorStockholderInformationId: number;
  organizationId: number | null;
  stockholderType: 'Person' | 'Organization' | null;

  // Person-specific
  firstName: string | null;
  lastName: string | null;

  // Organization-specific
  organizationName: string | null;
  publiclyTraded: boolean | null;

  // Publicly traded sub-field
  secFilingWebsite: string | null;

  // Address sub-fields (when not publicly traded)
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}
