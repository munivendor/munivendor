export class AchProfileData {
    CustomerProfileId!: string;
    RoutingNumber!: string;
    AccountNumber!: string; // Can be "checking", "savings", etc.
    FirstName!: string;
    LastName!: string;
    BillingAddress!: string;
    BillingZip!: string;
    BillingCountry!: string;
}
