import { Document } from "../Request/model/document.model"

export interface IRequestDocuments {
    required: Document[];
    optional: Document[];
    municipality: Document[];
}