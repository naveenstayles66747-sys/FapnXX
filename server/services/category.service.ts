import { auditService } from './audit.service';

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

const categories = new Map<string, CategoryRecord>();
const categoryRequests = new Map<string, CategoryRequestRecord>();

const INITIAL_CATEGORIES: CategoryRecord[] = [
  {
    id: 'trending',
    name: 'Trending',
    icon: 'local_fire_department',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    description: 'The hottest and most popular exclusive content trending across FapnXX.',
  },
  {
    id: 'amateur',
    name: 'Amateur',
    icon: 'person',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
    description: 'Discover the most popular community-uploaded content and raw cuts.',
  },
  {
    id: 'milf',
    name: 'MILF',
    icon: 'family_restroom',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-OYI524BZ48HOkZ2JX5LYqmyIji7hU1exKz5GYHfhzSmB-U9IkbGli86UCYFTtvOQH6an4ENmj1uvF4sp72yvfkdjfOxj4DabRz53a-5QteTtz51X2hJV59fVqCRf3CrvuQnvsBdSIKtFTJccaSZBw0iKvQmyqLiRjp1PVyDgBCKIjG7Dg9_ImGXxeIWah3swnYZ874JWJFH3yph7U5Z1lVuSuGTNd2F8mgXi84tEP0lIYp8o_MLS4A',
    description: 'Sophisticated luxury series and experienced performers in high definition.',
  },
  {
    id: 'teen',
    name: 'Teen',
    icon: 'emergency',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
    description: 'Young adult performers and vibrant, energetic cinematic encounters (18+).',
  },
  {
    id: 'anal',
    name: 'Anal',
    icon: 'settings_input_component',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTSrT7ZfnLWJmVyGjfLgykiPkmf7a4I4Z57uEg4c8C2_mJ0w3Y2UlFj5Gp5iEtMegkDAtFW4BKpVK3JE5pODTLTPETiDTQyukLYcV--2v9vb8b-OEkgHaWihpbbRppVRY0YbgqDfyvtuphn5xrfVZWgyDUKRJA2wZVxWJTWpDmQ6DpzeuUmUe8ySRNKup3oJc5VLYhRtM6nfKRK-UOZLtbi132Yme7AQeLMsUzD79lpUUp9Ckdox0HQQ',
    description: 'High-intensity, premium adult productions and uncensored releases.',
  },
  {
    id: 'lesbian',
    name: 'Lesbian',
    icon: 'female',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvVmv9cY2dl_zIEo33CGIwiRDN909BI0EosxDqwew2wWmzQP_fALhg57IyLPUEyXtxxUMdzTRHoU0b9duqmKCxKFHCaeOISv7kzyqQWZSkSvX5nQoG2fSInUivHEMqe740-4kJ8zEnE66XQAAe5y_iKuxl9fyETTTK2S3XuvUPBR8LeBvKRBZ7dWH7xKWCDTBBIS2NHus-SKFoVKwTAg2FwIYbonIdNIJRVcHnX3UV-TD_hHUgC1J6yw',
    description: 'Passionate and aesthetic female-centered romance and encounters.',
  },
  {
    id: 'pov',
    name: 'POV',
    icon: 'visibility',
    heroImage: 'https://lh3.googleusercontent.com/aida/AP1WRLs5y8ft3CThjXzumEpc3azxLY3QKyR8aZ3p0q786H2ndH2rdcjcbpMGVerFh_bCioKAuQRfUOdkx48FNdonP0tx-OxsMFArRHUx9_QMZ2q3VzQfWAIUBUZRvK9VGHJC3MYO8-zKg1JY36tH2BC8gl54Fg4OZqAl6Hu5nnfDFy8rgLjErqdnCiXTkuhA-Z7dKwuX0Z5XdGhS8uBLxIWlygmG82L4DvNTvPVWLxnZMiLdsJspXJESERcqnj4w',
    description: 'Immerse yourself completely. Experience every scene from the most intimate perspective.',
  },
];

INITIAL_CATEGORIES.forEach((c) => categories.set(c.id, c));

export const categoryService = {
  listCategories: (): CategoryRecord[] => {
    return Array.from(categories.values());
  },

  findById: (id: string): CategoryRecord | undefined => {
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
    const existing = categories.get(id);
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
    const existing = categories.get(id);
    if (!existing) {
      return false;
    }

    categories.delete(id);

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
    return newReq;
  },

  listCategoryRequests: (): CategoryRequestRecord[] => {
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
