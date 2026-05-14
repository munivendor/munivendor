import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../core/services/config.service';

@Component({
  standalone: true,
  selector: 'single-file-upload',
  templateUrl: './single-file-upload.component.html',
  styleUrls: ['./single-file-upload.component.css'],
  imports: [CommonModule],
})
export class SingleFileUploadComponent {
  @Output() fileUploaded = new EventEmitter<boolean>();
  @Input() data: any;
  status: 'initial' | 'uploading' | 'success' | 'fail' = 'initial';
  file: File | null = null;

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  ngOnInit(): void {}

  onChange(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.status = 'initial';
      this.file = file;
      this.fileUploaded.emit(true);
    }
  }

  onUpload() {
    if (this.file) {
      const formData = new FormData();
      formData.append('file', this.file, this.file.name);
      formData.append('requestId', this.data);

      const upload$ = this.http.post(
        `${this.config.apiUrl}UploadDocumentType`,
        formData,
      );
      this.status = 'uploading';

      upload$.subscribe({
        next: () => {
          this.status = 'success';
        },
        error: (error: any) => {
          this.status = 'fail';
          return throwError(() => error);
        },
      });
    }
  }
}
