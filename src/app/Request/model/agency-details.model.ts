export interface AgencyDetails {
  organizationId?: number | null;
  organizationName: string;
  address: string;
  address2: string | null;
  city: string;
  stateId: number | null;
  state?: string;
  zipCode: string;
  phone: string;
  //   logoUrl?: string | null;
}
