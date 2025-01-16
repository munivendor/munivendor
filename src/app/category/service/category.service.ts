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
  private idCounter = 1;

  constructor() {
    // Optionally, initialize with some default categories
    this.addCategory('Uncategorized', null);
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
    // Remove the category and any of its subcategories
    this.categories = this.categories.filter(cat => cat.id !== id && cat.parentId !== id);
    this.categoriesSubject.next(this.buildCategoryTree());
  }

  private buildCategoryTree(): Category[] {
    const idToCategoryMap = new Map<number, Category>();
    const rootCategories: Category[] = [];

    // Initialize categories without children
    this.categories.forEach(cat => {
      cat.children = [];
      idToCategoryMap.set(cat.id, cat);
    });

    // Build the tree structure
    this.categories.forEach(cat => {
      if (cat.parentId) {
        const parentCat = idToCategoryMap.get(cat.parentId);
        parentCat?.children?.push(cat);
      } else {
        rootCategories.push(cat);
      }
    });

    return rootCategories;
  }
}
