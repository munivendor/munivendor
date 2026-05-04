export interface OrganizationDocument {
  documentId: number; // used for deletion for now, will be updated to organizationDocumentId in the future
  documentName: string;
  fileName: string;
  uploadedAt: string;
  fileUrl?: string;
  organizationDocumentId: number; // used for downloading
}
