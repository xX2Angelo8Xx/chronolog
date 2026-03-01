import { create } from 'zustand';
import type { Job, Project, Category, Tag } from '@/types';
import * as dbService from '@/services/database';

interface DataState {
  jobs: Job[];
  projects: Project[];
  categories: Category[];
  tags: Tag[];
  isLoading: boolean;

  // Load
  loadJobs: (includeArchived?: boolean) => Promise<void>;
  loadProjects: (jobId?: string, includeArchived?: boolean) => Promise<void>;
  loadCategories: (includeArchived?: boolean) => Promise<void>;
  loadTags: () => Promise<void>;
  loadAll: () => Promise<void>;

  // Jobs
  addJob: (data: { name: string; color: string; hourly_rate?: number | null; currency?: string }) => Promise<Job>;
  updateJob: (id: string, data: Partial<Job>) => Promise<void>;
  removeJob: (id: string) => Promise<void>;

  // Projects
  addProject: (data: { job_id: string; name: string; color: string; description?: string; hourly_rate_override?: number | null }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  // Categories
  addCategory: (data: { name: string; color: string; icon?: string }) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  // Tags
  addTag: (data: { name: string; color?: string }) => Promise<Tag>;
  removeTag: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  jobs: [],
  projects: [],
  categories: [],
  tags: [],
  isLoading: false,

  loadJobs: async (includeArchived = false) => {
    const jobs = await dbService.getJobs(includeArchived);
    set({ jobs: jobs.map(mapJob) });
  },

  loadProjects: async (jobId?, includeArchived = false) => {
    const projects = await dbService.getProjects(jobId, includeArchived);
    set({ projects: projects.map(mapProject) });
  },

  loadCategories: async (includeArchived = false) => {
    const categories = await dbService.getCategories(includeArchived);
    set({ categories: categories.map(mapCategory) });
  },

  loadTags: async () => {
    const tags = await dbService.getTags();
    set({ tags });
  },

  loadAll: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().loadJobs(),
      get().loadProjects(),
      get().loadCategories(),
      get().loadTags(),
    ]);
    set({ isLoading: false });
  },

  addJob: async (data) => {
    const job = await dbService.createJob(data);
    await get().loadJobs();
    return mapJob(job);
  },

  updateJob: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.hourly_rate !== undefined) updateData.hourly_rate = data.hourly_rate;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.is_archived !== undefined) updateData.is_archived = data.is_archived ? 1 : 0;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    await dbService.updateJob(id, updateData);
    await get().loadJobs();
  },

  removeJob: async (id) => {
    await dbService.deleteJob(id);
    await get().loadJobs();
    await get().loadProjects();
  },

  addProject: async (data) => {
    const project = await dbService.createProject(data);
    await get().loadProjects();
    return mapProject(project);
  },

  updateProject: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.hourly_rate_override !== undefined) updateData.hourly_rate_override = data.hourly_rate_override;
    if (data.is_favorite !== undefined) updateData.is_favorite = data.is_favorite ? 1 : 0;
    if (data.is_archived !== undefined) updateData.is_archived = data.is_archived ? 1 : 0;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    await dbService.updateProject(id, updateData);
    await get().loadProjects();
  },

  removeProject: async (id) => {
    await dbService.deleteProject(id);
    await get().loadProjects();
  },

  addCategory: async (data) => {
    const category = await dbService.createCategory(data);
    await get().loadCategories();
    return mapCategory(category);
  },

  updateCategory: async (id, data) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.is_archived !== undefined) updateData.is_archived = data.is_archived ? 1 : 0;
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
    await dbService.updateCategory(id, updateData);
    await get().loadCategories();
  },

  removeCategory: async (id) => {
    await dbService.deleteCategory(id);
    await get().loadCategories();
  },

  addTag: async (data) => {
    const tag = await dbService.createTag(data);
    await get().loadTags();
    return tag;
  },

  removeTag: async (id) => {
    await dbService.deleteTag(id);
    await get().loadTags();
  },
}));

// Mappers from DB rows to typed objects
function mapJob(row: any): Job {
  return {
    ...row,
    is_archived: Boolean(row.is_archived),
  };
}

function mapProject(row: any): Project {
  return {
    ...row,
    is_favorite: Boolean(row.is_favorite),
    is_archived: Boolean(row.is_archived),
  };
}

function mapCategory(row: any): Category {
  return {
    ...row,
    is_archived: Boolean(row.is_archived),
  };
}
