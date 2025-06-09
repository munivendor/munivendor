export class RequestDocument {
    documentId: number | undefined;
    requestDocumentId?: number | null;
    requestId?: number | null;
    derived!: boolean;
    requiresNotarization!: boolean;
    required?: boolean | null;
    organizationDocumentId?: number | null;
  }