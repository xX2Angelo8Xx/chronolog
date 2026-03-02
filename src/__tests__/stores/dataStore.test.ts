import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDataStore } from '@/stores/dataStore';
import * as dbService from '@/services/database';

// Mock the database service module
vi.mock('@/services/database', () => ({
  getJobs: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  getProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
}));

// ==================== Fixtures ====================

const mockJob = (overrides: Partial<any> = {}) => ({
  id: 'job-1',
  name: 'Development',
  color: '#0078d4',
  hourly_rate: null,
  currency: 'EUR',
  is_archived: 0,
  sort_order: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const mockProject = (overrides: Partial<any> = {}) => ({
  id: 'proj-1',
  job_id: 'job-1',
  name: 'ChronoLog',
  color: '#107c10',
  description: null,
  hourly_rate_override: null,
  is_favorite: 0,
  is_archived: 0,
  sort_order: 0,
  job_name: 'Development',
  job_color: '#0078d4',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const mockCategory = (overrides: Partial<any> = {}) => ({
  id: 'cat-1',
  name: 'Coding',
  color: '#d83b01',
  icon: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const mockTag = (overrides: Partial<any> = {}) => ({
  id: 'tag-1',
  name: 'urgent',
  color: '#e74856',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const initialState = () => ({
  jobs: [],
  projects: [],
  categories: [],
  tags: [],
  isLoading: false,
});

describe('dataStore', () => {
  beforeEach(() => {
    useDataStore.setState(initialState());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Initial state ====================

  describe('initial state', () => {
    it('has correct default values', () => {
      useDataStore.setState(initialState());
      const state = useDataStore.getState();

      expect(state.jobs).toEqual([]);
      expect(state.projects).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.tags).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  // ==================== loadAll ====================

  describe('loadAll', () => {
    it('loads jobs, projects, categories, and tags', async () => {
      const jobs = [mockJob()];
      const projects = [mockProject()];
      const categories = [mockCategory()];
      const tags = [mockTag()];

      vi.mocked(dbService.getJobs).mockResolvedValue(jobs);
      vi.mocked(dbService.getProjects).mockResolvedValue(projects);
      vi.mocked(dbService.getCategories).mockResolvedValue(categories);
      vi.mocked(dbService.getTags).mockResolvedValue(tags);

      await useDataStore.getState().loadAll();

      const state = useDataStore.getState();
      expect(state.jobs).toHaveLength(1);
      expect(state.projects).toHaveLength(1);
      expect(state.categories).toHaveLength(1);
      expect(state.tags).toHaveLength(1);
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoading to true during load and false after', async () => {
      vi.mocked(dbService.getJobs).mockResolvedValue([]);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);
      vi.mocked(dbService.getTags).mockResolvedValue([]);

      const promise = useDataStore.getState().loadAll();

      // After awaiting, isLoading should be false
      await promise;
      expect(useDataStore.getState().isLoading).toBe(false);
    });

    it('maps is_archived from integer to boolean for jobs', async () => {
      vi.mocked(dbService.getJobs).mockResolvedValue([
        mockJob({ is_archived: 1 }),
        mockJob({ id: 'job-2', is_archived: 0 }),
      ]);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);
      vi.mocked(dbService.getTags).mockResolvedValue([]);

      await useDataStore.getState().loadAll();

      const state = useDataStore.getState();
      expect(state.jobs[0].is_archived).toBe(true);
      expect(state.jobs[1].is_archived).toBe(false);
    });

    it('maps is_favorite and is_archived for projects', async () => {
      vi.mocked(dbService.getJobs).mockResolvedValue([]);
      vi.mocked(dbService.getProjects).mockResolvedValue([
        mockProject({ is_favorite: 1, is_archived: 0 }),
        mockProject({ id: 'proj-2', is_favorite: 0, is_archived: 1 }),
      ]);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);
      vi.mocked(dbService.getTags).mockResolvedValue([]);

      await useDataStore.getState().loadAll();

      const state = useDataStore.getState();
      expect(state.projects[0].is_favorite).toBe(true);
      expect(state.projects[0].is_archived).toBe(false);
      expect(state.projects[1].is_favorite).toBe(false);
      expect(state.projects[1].is_archived).toBe(true);
    });

    it('handles empty data gracefully', async () => {
      vi.mocked(dbService.getJobs).mockResolvedValue([]);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);
      vi.mocked(dbService.getTags).mockResolvedValue([]);

      await useDataStore.getState().loadAll();

      const state = useDataStore.getState();
      expect(state.jobs).toHaveLength(0);
      expect(state.projects).toHaveLength(0);
      expect(state.categories).toHaveLength(0);
      expect(state.tags).toHaveLength(0);
    });
  });

  // ==================== loadJobs ====================

  describe('loadJobs', () => {
    it('loads jobs from the database', async () => {
      vi.mocked(dbService.getJobs).mockResolvedValue([mockJob(), mockJob({ id: 'job-2', name: 'Design' })]);

      await useDataStore.getState().loadJobs();

      expect(useDataStore.getState().jobs).toHaveLength(2);
      expect(dbService.getJobs).toHaveBeenCalledWith(false);
    });

    it('can include archived jobs', async () => {
      vi.mocked(dbService.getJobs).mockResolvedValue([]);

      await useDataStore.getState().loadJobs(true);

      expect(dbService.getJobs).toHaveBeenCalledWith(true);
    });
  });

  // ==================== loadProjects ====================

  describe('loadProjects', () => {
    it('loads projects from the database', async () => {
      vi.mocked(dbService.getProjects).mockResolvedValue([mockProject()]);

      await useDataStore.getState().loadProjects();

      expect(useDataStore.getState().projects).toHaveLength(1);
      expect(dbService.getProjects).toHaveBeenCalledWith(undefined, false);
    });

    it('can filter by jobId', async () => {
      vi.mocked(dbService.getProjects).mockResolvedValue([]);

      await useDataStore.getState().loadProjects('job-1');

      expect(dbService.getProjects).toHaveBeenCalledWith('job-1', false);
    });

    it('can include archived projects', async () => {
      vi.mocked(dbService.getProjects).mockResolvedValue([]);

      await useDataStore.getState().loadProjects(undefined, true);

      expect(dbService.getProjects).toHaveBeenCalledWith(undefined, true);
    });
  });

  // ==================== loadCategories ====================

  describe('loadCategories', () => {
    it('loads categories from the database', async () => {
      vi.mocked(dbService.getCategories).mockResolvedValue([mockCategory()]);

      await useDataStore.getState().loadCategories();

      expect(useDataStore.getState().categories).toHaveLength(1);
      expect(dbService.getCategories).toHaveBeenCalledWith(false);
    });
  });

  // ==================== loadTags ====================

  describe('loadTags', () => {
    it('loads tags from the database', async () => {
      vi.mocked(dbService.getTags).mockResolvedValue([mockTag(), mockTag({ id: 'tag-2', name: 'feature' })]);

      await useDataStore.getState().loadTags();

      expect(useDataStore.getState().tags).toHaveLength(2);
      expect(dbService.getTags).toHaveBeenCalledOnce();
    });
  });

  // ==================== addJob ====================

  describe('addJob', () => {
    it('creates a job and reloads jobs list', async () => {
      const newJob = mockJob({ id: 'job-new', name: 'Marketing' });
      vi.mocked(dbService.createJob).mockResolvedValue(newJob);
      vi.mocked(dbService.getJobs).mockResolvedValue([newJob]);

      const result = await useDataStore.getState().addJob({
        name: 'Marketing',
        color: '#0078d4',
      });

      expect(result.name).toBe('Marketing');
      expect(result.is_archived).toBe(false);
      expect(dbService.createJob).toHaveBeenCalledWith({
        name: 'Marketing',
        color: '#0078d4',
      });
      expect(dbService.getJobs).toHaveBeenCalled();
    });

    it('passes hourly_rate and currency when provided', async () => {
      const newJob = mockJob({ hourly_rate: 50, currency: 'USD' });
      vi.mocked(dbService.createJob).mockResolvedValue(newJob);
      vi.mocked(dbService.getJobs).mockResolvedValue([newJob]);

      await useDataStore.getState().addJob({
        name: 'Consulting',
        color: '#107c10',
        hourly_rate: 50,
        currency: 'USD',
      });

      expect(dbService.createJob).toHaveBeenCalledWith({
        name: 'Consulting',
        color: '#107c10',
        hourly_rate: 50,
        currency: 'USD',
      });
    });
  });

  // ==================== updateJob ====================

  describe('updateJob', () => {
    it('updates job name and reloads', async () => {
      vi.mocked(dbService.updateJob).mockResolvedValue(undefined);
      vi.mocked(dbService.getJobs).mockResolvedValue([mockJob({ name: 'Updated' })]);

      await useDataStore.getState().updateJob('job-1', { name: 'Updated' });

      expect(dbService.updateJob).toHaveBeenCalledWith('job-1', { name: 'Updated' });
      expect(dbService.getJobs).toHaveBeenCalled();
    });

    it('converts is_archived boolean to integer for DB', async () => {
      vi.mocked(dbService.updateJob).mockResolvedValue(undefined);
      vi.mocked(dbService.getJobs).mockResolvedValue([]);

      await useDataStore.getState().updateJob('job-1', { is_archived: true } as any);

      expect(dbService.updateJob).toHaveBeenCalledWith('job-1', { is_archived: 1 });
    });

    it('handles color update', async () => {
      vi.mocked(dbService.updateJob).mockResolvedValue(undefined);
      vi.mocked(dbService.getJobs).mockResolvedValue([]);

      await useDataStore.getState().updateJob('job-1', { color: '#ff0000' });

      expect(dbService.updateJob).toHaveBeenCalledWith('job-1', { color: '#ff0000' });
    });

    it('handles hourly_rate update', async () => {
      vi.mocked(dbService.updateJob).mockResolvedValue(undefined);
      vi.mocked(dbService.getJobs).mockResolvedValue([]);

      await useDataStore.getState().updateJob('job-1', { hourly_rate: 75 } as any);

      expect(dbService.updateJob).toHaveBeenCalledWith('job-1', { hourly_rate: 75 });
    });
  });

  // ==================== removeJob ====================

  describe('removeJob', () => {
    it('deletes a job and reloads jobs and projects', async () => {
      vi.mocked(dbService.deleteJob).mockResolvedValue(undefined);
      vi.mocked(dbService.getJobs).mockResolvedValue([]);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);

      useDataStore.setState({ jobs: [{ ...mockJob(), is_archived: false }] as any });

      await useDataStore.getState().removeJob('job-1');

      expect(dbService.deleteJob).toHaveBeenCalledWith('job-1');
      expect(dbService.getJobs).toHaveBeenCalled();
      // removeJob also reloads projects since projects belong to jobs
      expect(dbService.getProjects).toHaveBeenCalled();
      expect(useDataStore.getState().jobs).toHaveLength(0);
    });
  });

  // ==================== addProject ====================

  describe('addProject', () => {
    it('creates a project and reloads projects list', async () => {
      const newProject = mockProject({ id: 'proj-new', name: 'New Project' });
      vi.mocked(dbService.createProject).mockResolvedValue(newProject);
      vi.mocked(dbService.getProjects).mockResolvedValue([newProject]);

      const result = await useDataStore.getState().addProject({
        job_id: 'job-1',
        name: 'New Project',
        color: '#107c10',
      });

      expect(result.name).toBe('New Project');
      expect(result.is_favorite).toBe(false);
      expect(result.is_archived).toBe(false);
      expect(dbService.createProject).toHaveBeenCalledWith({
        job_id: 'job-1',
        name: 'New Project',
        color: '#107c10',
      });
      expect(dbService.getProjects).toHaveBeenCalled();
    });

    it('passes optional fields when provided', async () => {
      const newProject = mockProject({ description: 'A description', hourly_rate_override: 45 });
      vi.mocked(dbService.createProject).mockResolvedValue(newProject);
      vi.mocked(dbService.getProjects).mockResolvedValue([newProject]);

      await useDataStore.getState().addProject({
        job_id: 'job-1',
        name: 'Detailed Project',
        color: '#0078d4',
        description: 'A description',
        hourly_rate_override: 45,
      });

      expect(dbService.createProject).toHaveBeenCalledWith({
        job_id: 'job-1',
        name: 'Detailed Project',
        color: '#0078d4',
        description: 'A description',
        hourly_rate_override: 45,
      });
    });
  });

  // ==================== updateProject ====================

  describe('updateProject', () => {
    it('updates project and reloads', async () => {
      vi.mocked(dbService.updateProject).mockResolvedValue(undefined);
      vi.mocked(dbService.getProjects).mockResolvedValue([mockProject({ name: 'Renamed' })]);

      await useDataStore.getState().updateProject('proj-1', { name: 'Renamed' });

      expect(dbService.updateProject).toHaveBeenCalledWith('proj-1', { name: 'Renamed' });
      expect(dbService.getProjects).toHaveBeenCalled();
    });

    it('converts is_favorite boolean to integer', async () => {
      vi.mocked(dbService.updateProject).mockResolvedValue(undefined);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);

      await useDataStore.getState().updateProject('proj-1', { is_favorite: true } as any);

      expect(dbService.updateProject).toHaveBeenCalledWith('proj-1', { is_favorite: 1 });
    });

    it('converts is_archived boolean to integer', async () => {
      vi.mocked(dbService.updateProject).mockResolvedValue(undefined);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);

      await useDataStore.getState().updateProject('proj-1', { is_archived: true } as any);

      expect(dbService.updateProject).toHaveBeenCalledWith('proj-1', { is_archived: 1 });
    });
  });

  // ==================== removeProject ====================

  describe('removeProject', () => {
    it('deletes a project and reloads projects', async () => {
      vi.mocked(dbService.deleteProject).mockResolvedValue(undefined);
      vi.mocked(dbService.getProjects).mockResolvedValue([]);

      useDataStore.setState({ projects: [{ ...mockProject(), is_favorite: false, is_archived: false }] as any });

      await useDataStore.getState().removeProject('proj-1');

      expect(dbService.deleteProject).toHaveBeenCalledWith('proj-1');
      expect(dbService.getProjects).toHaveBeenCalled();
      expect(useDataStore.getState().projects).toHaveLength(0);
    });
  });

  // ==================== addCategory ====================

  describe('addCategory', () => {
    it('creates a category and reloads categories list', async () => {
      const newCat = mockCategory({ id: 'cat-new', name: 'Research' });
      vi.mocked(dbService.createCategory).mockResolvedValue(newCat);
      vi.mocked(dbService.getCategories).mockResolvedValue([newCat]);

      const result = await useDataStore.getState().addCategory({
        name: 'Research',
        color: '#b4009e',
      });

      expect(result.name).toBe('Research');
      expect(result.is_archived).toBe(false);
      expect(dbService.createCategory).toHaveBeenCalledWith({
        name: 'Research',
        color: '#b4009e',
      });
      expect(dbService.getCategories).toHaveBeenCalled();
    });

    it('passes icon when provided', async () => {
      const newCat = mockCategory({ icon: 'book' });
      vi.mocked(dbService.createCategory).mockResolvedValue(newCat);
      vi.mocked(dbService.getCategories).mockResolvedValue([newCat]);

      await useDataStore.getState().addCategory({
        name: 'Reading',
        color: '#8764b8',
        icon: 'book',
      });

      expect(dbService.createCategory).toHaveBeenCalledWith({
        name: 'Reading',
        color: '#8764b8',
        icon: 'book',
      });
    });
  });

  // ==================== updateCategory ====================

  describe('updateCategory', () => {
    it('updates category and reloads', async () => {
      vi.mocked(dbService.updateCategory).mockResolvedValue(undefined);
      vi.mocked(dbService.getCategories).mockResolvedValue([mockCategory({ name: 'Updated' })]);

      await useDataStore.getState().updateCategory('cat-1', { name: 'Updated' });

      expect(dbService.updateCategory).toHaveBeenCalledWith('cat-1', { name: 'Updated' });
      expect(dbService.getCategories).toHaveBeenCalled();
    });

    it('converts is_archived boolean to integer', async () => {
      vi.mocked(dbService.updateCategory).mockResolvedValue(undefined);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);

      await useDataStore.getState().updateCategory('cat-1', { is_archived: true } as any);

      expect(dbService.updateCategory).toHaveBeenCalledWith('cat-1', { is_archived: 1 });
    });

    it('handles icon and color update', async () => {
      vi.mocked(dbService.updateCategory).mockResolvedValue(undefined);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);

      await useDataStore.getState().updateCategory('cat-1', { icon: 'star', color: '#ff0000' });

      expect(dbService.updateCategory).toHaveBeenCalledWith('cat-1', { icon: 'star', color: '#ff0000' });
    });
  });

  // ==================== removeCategory ====================

  describe('removeCategory', () => {
    it('deletes a category and reloads categories', async () => {
      vi.mocked(dbService.deleteCategory).mockResolvedValue(undefined);
      vi.mocked(dbService.getCategories).mockResolvedValue([]);

      useDataStore.setState({ categories: [{ ...mockCategory(), is_archived: false }] as any });

      await useDataStore.getState().removeCategory('cat-1');

      expect(dbService.deleteCategory).toHaveBeenCalledWith('cat-1');
      expect(dbService.getCategories).toHaveBeenCalled();
      expect(useDataStore.getState().categories).toHaveLength(0);
    });
  });

  // ==================== addTag ====================

  describe('addTag', () => {
    it('creates a tag and reloads tags list', async () => {
      const newTag = mockTag({ id: 'tag-new', name: 'bugfix' });
      vi.mocked(dbService.createTag).mockResolvedValue(newTag);
      vi.mocked(dbService.getTags).mockResolvedValue([newTag]);

      const result = await useDataStore.getState().addTag({ name: 'bugfix' });

      expect(result.name).toBe('bugfix');
      expect(dbService.createTag).toHaveBeenCalledWith({ name: 'bugfix' });
      expect(dbService.getTags).toHaveBeenCalled();
    });

    it('passes color when provided', async () => {
      const newTag = mockTag({ color: '#00b7c3' });
      vi.mocked(dbService.createTag).mockResolvedValue(newTag);
      vi.mocked(dbService.getTags).mockResolvedValue([newTag]);

      await useDataStore.getState().addTag({ name: 'feature', color: '#00b7c3' });

      expect(dbService.createTag).toHaveBeenCalledWith({ name: 'feature', color: '#00b7c3' });
    });
  });

  // ==================== removeTag ====================

  describe('removeTag', () => {
    it('deletes a tag and reloads tags list', async () => {
      vi.mocked(dbService.deleteTag).mockResolvedValue(undefined);
      vi.mocked(dbService.getTags).mockResolvedValue([]);

      useDataStore.setState({ tags: [mockTag()] as any });

      await useDataStore.getState().removeTag('tag-1');

      expect(dbService.deleteTag).toHaveBeenCalledWith('tag-1');
      expect(dbService.getTags).toHaveBeenCalled();
      expect(useDataStore.getState().tags).toHaveLength(0);
    });
  });
});
