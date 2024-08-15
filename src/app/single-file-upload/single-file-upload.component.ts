import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';


@Component({
  standalone:true,
  selector: 'single-file-upload',
  templateUrl: './single-file-upload.component.html',
  styleUrls: ['./single-file-upload.component.css'],
  imports:[CommonModule]
})
export class SingleFileUploadComponent {

  @Output() fileUploaded = new EventEmitter<boolean>();
  @Input() data: any;
  status: 'initial' | 'uploading' | 'success' | 'fail' = 'initial';
  file: File | null = null;

  constructor(private http: HttpClient) {}

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
      const url = environment.apiUrl;

      formData.append('file', this.file, this.file.name);
      formData.append('requestId', this.data);

      const upload$ = this.http.post(url+'UploadRequestFile', formData);

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