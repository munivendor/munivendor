export interface DocumentInstance {
    documentInstanceId: number;
    documentId: number;
    requestId: number;
    documentStatusId: number;
    documentStatus: string;
    documentName: string;
    requestDocumentId: number;
    documentInstanceStatusId: number; // (1=incomplete, 2= complete)
    active: boolean;
    documentInstanceStatus: string;
  }