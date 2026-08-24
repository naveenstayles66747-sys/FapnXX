import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';

export interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  heroImage: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryRequestRecord {
  id: string;
  categoryName: string;
  videoTitle?: string;
  requestedByEmail?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

// In-memory cache synced with Firestore
const categories = new Map<string, CategoryRecord>();
const categoryRequests = new Map<string, CategoryRequestRecord>();
let isFirestoreCategoriesInitialized = false;

// Sync from Firestore DB
async function initFirestoreCategoriesSync() {
  if (isFirestoreCategoriesInitialized) return;
  try {
    const snapshot = await adminDb.collection('categories').get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as CategoryRecord;
        categories.set(doc.id, { ...data, id: doc.id });
      });
      console.log(`✅ [Firestore CategoryService] Loaded ${snapshot.size} categories from Firestore.`);
    }

    const reqSnap = await adminDb.collection('category_requests').get();
    if (!reqSnap.empty) {
      reqSnap.forEach((doc) => {
        const data = doc.data() as CategoryRequestRecord;
        categoryRequests.set(doc.id, { ...data, id: doc.id });
      });
    }
    isFirestoreCategoriesInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore CategoryService] Sync fallback:', err.message);
  }
}

initFirestoreCategoriesSync();

export const categoryService = {
  listCategories: async (): Promise<CategoryRecord[]> => {
    try {
      const snap = await adminDb.collection('categories').get();
      if (!snap.empty) {
        const list: CategoryRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as CategoryRecord;
          const c = { ...data, id: doc.id };
          list.push(c);
          categories.set(doc.id, c);
        });
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CategoryService] listCategories notice:', err.message);
    }
    return Array.from(categories.values());
  },

  findById: async (id: string): Promise<CategoryRecord | undefined> => {
    try {
      const docSnap = await adminDb.collection('categories').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as CategoryRecord;
        const c = { ...data, id: docSnap.id };
        categories.set(id, c);
        return c;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CategoryService] findById notice:', err.message);
    }
    return categories.get(id);
  },

  create: async (data: CategoryRecord, actorId: string, actorEmail: string, actorRole: string): Promise<CategoryRecord> => {
    const id = data.id.trim().toLowerCase().replace(/\s+/g, '-');
    const now = new Date().toISOString();
    const newCategory: CategoryRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    categories.set(id, newCategory);

    // Save to Firestore DB
    try {
      await adminDb.collection('categories').doc(id).set(newCategory);
    } catch (err: any) {
      console.warn(`[Firestore Category] Save error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'category.created',
      targetType: 'category',
      targetId: id,
      metadata: { name: newCategory.name },
    });

    return newCategory;
  },


  update: async (id: string, updates: Partial<CategoryRecord>, actorId: string, actorEmail: string, actorRole: string): Promise<CategoryRecord> => {
    const existing = await categoryService.findById(id);
    if (!existing) {
      throw new Error(`Category with ID ${id} not found.`);
    }

    const updated: CategoryRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    categories.set(id, updated);

    // Save to Firestore DB
    try {
      await adminDb.collection('categories').doc(id).set(updated, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Category] Update error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'category.updated',
      targetType: 'category',
      targetId: id,
      metadata: { name: updated.name },
    });

    return updated;
  },

  delete: async (id: string, actorId: string, actorEmail: string, actorRole: string): Promise<boolean> => {
    const existing = await categoryService.findById(id);
    if (!existing) {
      return false;
    }

    categories.delete(id);

    // Delete from Firestore DB
    try {
      await adminDb.collection('categories').doc(id).delete();
    } catch (err: any) {
      console.warn(`[Firestore Category] Delete error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'category.deleted',
      targetType: 'category',
      targetId: id,
      metadata: { name: existing.name },
    });

    return true;
  },

  requestCategory: async (data: { categoryName: string; videoTitle?: string; requestedByEmail?: string }): Promise<CategoryRequestRecord> => {
    const id = `cat-req-${Date.now()}`;
    const newReq: CategoryRequestRecord = {
      id,
      categoryName: data.categoryName.trim(),
      videoTitle: data.videoTitle?.trim(),
      requestedByEmail: data.requestedByEmail?.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    categoryRequests.set(id, newReq);

    // Save request to Firestore DB
    try {
      await adminDb.collection('category_requests').doc(id).set(newReq);
    } catch (err: any) {
      console.warn(`[Firestore CategoryRequest] Save error:`, err.message);
    }

    return newReq;
  },

  listCategoryRequests: async (): Promise<CategoryRequestRecord[]> => {
    try {
      const snap = await adminDb.collection('category_requests').get();
      if (!snap.empty) {
        const list: CategoryRequestRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as CategoryRequestRecord;
          const req = { ...data, id: doc.id };
          list.push(req);
          categoryRequests.set(doc.id, req);
        });
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CategoryService] listCategoryRequests notice:', err.message);
    }
    return Array.from(categoryRequests.values());
  },

  updateCategoryRequestStatus: async (
    id: string,
    status: 'approved' | 'rejected',
    actorId: string,
    actorEmail: string,
    actorRole: string
  ): Promise<CategoryRequestRecord> => {
    const req = categoryRequests.get(id);
    if (!req) {
      throw new Error('Category request not found.');
    }

    req.status = status;
    categoryRequests.set(id, req);

    try {
      await adminDb.collection('category_requests').doc(id).set({ status }, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore CategoryRequest] Status update error:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: `category_request.${status}`,
      targetType: 'category_request',
      targetId: id,
      metadata: { categoryName: req.categoryName },
    });

    return req;
  },
};

