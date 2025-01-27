// src/app/services/category.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Category } from '../model/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$ = this.categoriesSubject.asObservable();
  private categories: Category[] = [];
  private idCounter = 10; // Starting from 10 to account for existing IDs

  constructor() {
    // Initialize with sample categories
    this.categories = [
      { id: 1, name: 'Technology', parentId: null },
      { id: 2, name: 'Lifestyle', parentId: null },
      { id: 3, name: 'Software', parentId: 1 },
      { id: 4, name: 'Hardware', parentId: 1 },
      { id: 5, name: 'Programming', parentId: 3 },
      { id: 6, name: 'Health', parentId: 2 },
      { id: 7, name: 'Travel', parentId: 2 },
      { id: 8, name: 'Europe', parentId: 7 },
      { id: 9, name: 'Asia', parentId: 7 },
    ];
    this.categoriesSubject.next(this.buildCategoryTree());
  }

  getCategories() {
    return this.categoriesSubject.value;
  }

  addCategory(name: string, parentId: number | null) {
    const newCategory: Category = {
      id: this.idCounter++,
      name,
      parentId,
    };
    this.categories.push(newCategory);
    this.categoriesSubject.next(this.buildCategoryTree());
  }

  deleteCategory(id: number) {
    // Remove the category and its descendants
    const idsToDelete = this.getCategoryAndDescendantsIds(id);
    this.categories = this.categories.filter(cat => !idsToDelete.includes(cat.id));
    this.categoriesSubject.next(this.buildCategoryTree());
  }

  private getCategoryAndDescendantsIds(id: number): number[] {
    const idsToDelete = [id];
    const children = this.categories.filter(cat => cat.parentId === id);
    for (const child of children) {
      idsToDelete.push(...this.getCategoryAndDescendantsIds(child.id));
    }
    return idsToDelete;
  }

  private buildCategoryTree(): Category[] {
    const idToCategoryMap = new Map<number, Category>();
    const rootCategories: Category[] = [];

    // Initialize categories with empty children arrays
    this.categories.forEach(cat => {
      cat.children = [];
      idToCategoryMap.set(cat.id, cat);
    });

    // Build the tree structure
    this.categories.forEach(cat => {
      if (cat.parentId !== null && cat.parentId !== undefined) {
        const parentCat = idToCategoryMap.get(cat.parentId);
        if (parentCat) {
          parentCat?.children?.push(cat);
        } else {
          console.error(`Parent category not found for category: ${cat.name}`);
        }
      } else {
        rootCategories.push(cat);
      }
    });

    return rootCategories;
  }
}
