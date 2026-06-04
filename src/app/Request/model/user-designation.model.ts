export interface UserDesignation {
  userId?: number;
  designationId?: number;
  firstName: string;
  lastName: string | null;
  title: string;
  workPhoneNumber: string;
  personalPhoneNumber?: string | null;
  workEmail: string;
  confirmEmail?: string;
  receivesEmailSolicitations?: boolean;
}
