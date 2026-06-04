export interface OfferorLegalInfo {
  offerorLegalInformationId?: number | null;
  organizationId?: number | null;
  contractFailure: boolean | null;
  liensLawsuits: boolean | null;
  contractFailureDetails?: string | null;
  liensLawsuitsDetails?: string | null;
}
