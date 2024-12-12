import { Document } from "./document.model"

export class RequestDocument {
    required?: Document[];
    optional?: Document[];
    municipality?: Document[];
}