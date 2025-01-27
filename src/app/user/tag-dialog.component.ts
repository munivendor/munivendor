/*import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { User } from './user-grid.component';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TagService } from '../services/tag.service';
import { Tag } from './shared/models/tag.model';

@Component({
  selector: 'app-tag-dialog',
  templateUrl: './tag-dialog.component.html',
  standalone: true,
  imports: [
    MatListModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    FormsModule,
    MatCheckboxModule
  ]
})
export class TagDialogComponent implements OnInit {
  availableTags: Tag[] = [];
  userTags: Tag[] = [];
  selectedTags: number[] = [];

  constructor(
    public dialogRef: MatDialogRef<TagDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User },
    private tagService: TagService
  ) { }

  ngOnInit(): void {
    this.loadUserTags(this.data.user.userId);
    this.loadAvailableTags(this.data.user.userId);
  }

  loadUserTags(userId: number): void {
    this.tagService.getTags(userId).subscribe(tags => {
      this.userTags = tags;
      this.selectedTags = this.userTags.map(tag => tag.tagId);
    });
  }

  loadAvailableTags(userId: number): void {
    // Assuming we have an endpoint to get all possible tags
    this.tagService.getAllTags().subscribe(tags => {
      this.availableTags = tags.filter(tag => !this.selectedTags.includes(tag.tagId));
    });
  }

  deleteTag(tagId: number): void {
    this.tagService.deleteTag(tagId).subscribe(() => {
      this.userTags = this.userTags.filter(tag => tag.tagId !== tagId);
      this.loadAvailableTags(this.data.user.userId);
    });
  }

  save(): void {
    const tagsToAdd = this.availableTags.filter(tag => this.selectedTags.includes(tag.tagId));
    this.tagService.addTagsToUser(this.data.user.userId, tagsToAdd).subscribe(() => {
      this.dialogRef.close(tagsToAdd);
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}*/
