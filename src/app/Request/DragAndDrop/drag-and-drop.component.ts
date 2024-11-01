import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { RequestService } from '../services/request.service';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';

@Component({
    selector: 'app-drag-and-drop',
    standalone: true,
    templateUrl: './drag-and-drop.component.html',
    styleUrls: ['./drag-and-drop.component.css'],
    imports: [
        CommonModule,
        MatCardModule,
        DragDropModule,
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        FormsModule
    ]
})
export class DragAndDropUploaderComponent {
    ngOnInit(): void {
        // Subscribe to requestId changes from StateService
        // fetchRequestSections will be needed in 'create template/previous request'
        this.stateService.currentRequestId$.subscribe((id: number | null) => {
            this.requestId = id;
        });
    }

    municipalityDocuments: { file: File, documentTitle: string }[] = [];
    requestId: number | null = null;

    @Output() filesDropped: EventEmitter<{ file: File, documentTitle: string }[]> = new EventEmitter();

    constructor(
        private requestService: RequestService,
        private stateService: StateService
    ) { }

    // Handles file selection or drop
    onFileDropped(files: FileList): void {
        for (let i = 0; i < files.length; i++) {
            this.municipalityDocuments.push({ file: files[i], documentTitle: '' });
        }
    }

  // Handle the drop event
  onDrop(event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(event.dataTransfer.files);
      this.addFiles(droppedFiles);
      event.dataTransfer.clearData();
    }
  }

    // Prevent default behavior for dragover event
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Handle file selection via input
    onFileSelect(event: any) {
        if (event.target.files) {
            this.addFiles(Array.from(event.target.files));
        }
    }

    // Add files to the existing file list and initialize aliases
    addFiles(newFiles: File[]) {
        const uniqueFiles = newFiles.filter(
            (newFile) => !this.municipalityDocuments.some(document => document.file.name === newFile.name)
        );

        // Add unique files to municipalityDocuments with an empty documentTitle
        this.municipalityDocuments = [
            ...this.municipalityDocuments,
            ...uniqueFiles.map(file => ({ file, documentTitle: '' }))
        ];

        // Emit the updated files and document titles
        this.emitFilesWithDocumentTitles();
    }

    // Removes a file from the list
    removeFile(index: number): void {
        this.municipalityDocuments.splice(index, 1);
    }

    // Emit files along with their aliases
    emitFilesWithDocumentTitles(): void {
        const emitFilesWithDocumentTitles = this.municipalityDocuments.map((document, index) => ({
            file: document.file,
            documentTitle: document.documentTitle || '' // Fallback to empty string if no title provided
        }));

        // Emit an array of { file, documentTitle } objects
        this.filesDropped.emit(emitFilesWithDocumentTitles);
    }

    formatBytes(bytes: number, decimals = 2): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    uploadDocuments(): void {
        const requestId = 29;
        if (requestId === null || requestId === undefined) {
            return;
        }
        // this.municipalityDocuments.forEach(document => {
        //     this.requestService.UploadMunicipalityRequestDocument(requestId, document.file, document.documentTitle)
        //         .subscribe(
        //             (response) => {
        //                 console.log('File uploaded successfully', response);
        //             },
        //             (error) => {
        //                 console.error('Error uploading file:', error);
        //             }
        //         );
        // });
    }
}
