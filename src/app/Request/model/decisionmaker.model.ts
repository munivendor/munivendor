export interface DecisionMaker {
  decisionMakerId: number;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
  phoneNumber: string | null;
  emailSolicitations: boolean | null;
}
