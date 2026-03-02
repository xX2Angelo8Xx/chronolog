import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Input,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  tokens,
  Badge,
  Tab,
  TabList,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  AddRegular,
  DeleteRegular,
  EditRegular,
  ArchiveRegular,
  StarRegular,
  StarFilled,
} from '@fluentui/react-icons';
import { useDataStore } from '@/stores/dataStore';
import { COLOR_PALETTE } from '@/utils/helpers';
import { ColorPicker } from './ColorPicker';
import type { Job, Project, Category, Tag } from '@/types';

type ManageTab = 'jobs' | 'projects' | 'categories' | 'tags';

export function ManagePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ManageTab>('jobs');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('manage.title')}</h1>
      </div>

      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as ManageTab)}
        style={{ marginBottom: 20 }}
      >
        <Tab value="jobs">{t('manage.jobs')}</Tab>
        <Tab value="projects">{t('manage.projects')}</Tab>
        <Tab value="categories">{t('manage.categories')}</Tab>
        <Tab value="tags">{t('manage.tags')}</Tab>
      </TabList>

      {activeTab === 'jobs' && <JobsSection />}
      {activeTab === 'projects' && <ProjectsSection />}
      {activeTab === 'categories' && <CategoriesSection />}
      {activeTab === 'tags' && <TagsSection />}
    </div>
  );
}

// ==================== Jobs ====================
function JobsSection() {
  const { t } = useTranslation();
  const { jobs, addJob, updateJob, removeJob } = useDataStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('EUR');

  const openAdd = () => {
    setEditId(null);
    setName('');
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setHourlyRate('');
    setCurrency('EUR');
    setIsDialogOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditId(job.id);
    setName(job.name);
    setColor(job.color);
    setHourlyRate(job.hourly_rate?.toString() || '');
    setCurrency(job.currency || 'EUR');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name) return;
    if (editId) {
      await updateJob(editId, {
        name,
        color,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        currency,
      });
    } else {
      await addJob({
        name,
        color,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        currency,
      });
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button appearance="primary" icon={<AddRegular />} onClick={openAdd}>
          {t('manage.addJob')}
        </Button>
      </div>

      <div className="entries-list">
        {jobs.length === 0 ? (
          <Card style={{ padding: 48, textAlign: 'center', background: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground3 }}>
            {t('manage.noJobs')}
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} style={{ padding: '12px 16px', background: tokens.colorNeutralBackground1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="color-dot" style={{ background: job.color, width: 14, height: 14, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{job.name}</div>
                  {job.hourly_rate != null && (
                    <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                      {job.hourly_rate} {job.currency}/h
                    </div>
                  )}
                </div>
                {job.is_archived && (
                  <Badge appearance="outline" size="small" color="warning">
                    {t('manage.archive')}
                  </Badge>
                )}
                <Button appearance="subtle" size="small" icon={<EditRegular />} onClick={() => openEdit(job)} />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<ArchiveRegular />}
                  onClick={() => updateJob(job.id, { is_archived: !job.is_archived })}
                  title={job.is_archived ? t('manage.unarchive') : t('manage.archive')}
                />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<DeleteRegular />}
                  onClick={() => removeJob(job.id)}
                  style={{ color: '#e74856' }}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editId ? t('manage.editJob') : t('manage.addJob')}</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.name')} *</label>
                  <Input value={name} onChange={(_, data) => setName(data.value)} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.color')}</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.hourlyRate')}</label>
                  <Input type="number" value={hourlyRate} onChange={(_, data) => setHourlyRate(data.value)} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Currency</label>
                  <Dropdown
                    value={currency}
                    selectedOptions={[currency]}
                    onOptionSelect={(_, data) => setCurrency(data.optionValue as string)}
                    style={{ minWidth: 120 }}
                  >
                    <Option value="EUR" text="EUR">EUR (€)</Option>
                    <Option value="USD" text="USD">USD ($)</Option>
                    <Option value="GBP" text="GBP">GBP (£)</Option>
                    <Option value="CHF" text="CHF">CHF (Fr.)</Option>
                  </Dropdown>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('common.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleSave} disabled={!name}>
                {t('common.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}

// ==================== Projects ====================
function ProjectsSection() {
  const { t } = useTranslation();
  const { jobs, projects, addProject, updateProject, removeProject } = useDataStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [jobId, setJobId] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRateOverride, setHourlyRateOverride] = useState('');

  const activeJobs = jobs.filter((j) => !j.is_archived);

  const openAdd = () => {
    setEditId(null);
    setName('');
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setJobId(activeJobs[0]?.id || '');
    setDescription('');
    setHourlyRateOverride('');
    setIsDialogOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditId(project.id);
    setName(project.name);
    setColor(project.color);
    setJobId(project.job_id);
    setDescription(project.description || '');
    setHourlyRateOverride(project.hourly_rate_override?.toString() || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !jobId) return;
    if (editId) {
      await updateProject(editId, {
        name,
        color,
        description: description || undefined,
        hourly_rate_override: hourlyRateOverride ? parseFloat(hourlyRateOverride) : null,
      } as any);
    } else {
      await addProject({
        job_id: jobId,
        name,
        color,
        description: description || undefined,
        hourly_rate_override: hourlyRateOverride ? parseFloat(hourlyRateOverride) : null,
      });
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button appearance="primary" icon={<AddRegular />} onClick={openAdd} disabled={activeJobs.length === 0}>
          {t('manage.addProject')}
        </Button>
      </div>

      <div className="entries-list">
        {projects.length === 0 ? (
          <Card style={{ padding: 48, textAlign: 'center', background: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground3 }}>
            {t('manage.noProjects')}
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} style={{ padding: '12px 16px', background: tokens.colorNeutralBackground1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="color-dot" style={{ background: project.color, width: 14, height: 14, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {project.name}
                    {project.is_favorite && <StarFilled style={{ color: '#f59e0b', marginLeft: 6, fontSize: 14 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                    {project.job_name}
                    {project.description && ` · ${project.description}`}
                  </div>
                </div>
                {project.is_archived && (
                  <Badge appearance="outline" size="small" color="warning">
                    {t('manage.archive')}
                  </Badge>
                )}
                <Button
                  appearance="subtle"
                  size="small"
                  icon={project.is_favorite ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarRegular />}
                  onClick={() => updateProject(project.id, { is_favorite: !project.is_favorite })}
                  title={t('manage.favorite')}
                />
                <Button appearance="subtle" size="small" icon={<EditRegular />} onClick={() => openEdit(project)} />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<ArchiveRegular />}
                  onClick={() => updateProject(project.id, { is_archived: !project.is_archived })}
                  title={project.is_archived ? t('manage.unarchive') : t('manage.archive')}
                />
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<DeleteRegular />}
                  onClick={() => removeProject(project.id)}
                  style={{ color: '#e74856' }}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editId ? t('manage.editProject') : t('manage.addProject')}</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('entries.job')} *</label>
                  <Dropdown
                    value={activeJobs.find((j) => j.id === jobId)?.name || ''}
                    selectedOptions={jobId ? [jobId] : []}
                    onOptionSelect={(_, data) => setJobId(data.optionValue as string)}
                    style={{ minWidth: 200 }}
                  >
                    {activeJobs.map((job) => (
                      <Option key={job.id} value={job.id} text={job.name}>
                        <span className="color-dot" style={{ background: job.color, width: 10, height: 10, borderRadius: '50%', display: 'inline-block', marginRight: 8 }} />
                        {job.name}
                      </Option>
                    ))}
                  </Dropdown>
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.name')} *</label>
                  <Input value={name} onChange={(_, data) => setName(data.value)} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.color')}</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.description')}</label>
                  <Input value={description} onChange={(_, data) => setDescription(data.value)} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.hourlyRateOverride')}</label>
                  <Input
                    type="number"
                    value={hourlyRateOverride}
                    onChange={(_, data) => setHourlyRateOverride(data.value)}
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('common.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleSave} disabled={!name || !jobId}>
                {t('common.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}

// ==================== Categories ====================
function CategoriesSection() {
  const { t } = useTranslation();
  const { categories, addCategory, updateCategory, removeCategory } = useDataStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState('');

  const openAdd = () => {
    setEditId(null);
    setName('');
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setIcon('');
    setIsDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name) return;
    if (editId) {
      await updateCategory(editId, { name, color, icon: icon || undefined });
    } else {
      await addCategory({ name, color, icon: icon || undefined });
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button appearance="primary" icon={<AddRegular />} onClick={openAdd}>
          {t('manage.addCategory')}
        </Button>
      </div>

      <div className="entries-list">
        {categories.length === 0 ? (
          <Card style={{ padding: 48, textAlign: 'center', background: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground3 }}>
            {t('manage.noCategories')}
          </Card>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} style={{ padding: '12px 16px', background: tokens.colorNeutralBackground1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="color-dot" style={{ background: cat.color, width: 14, height: 14, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {cat.icon && <span style={{ marginRight: 6 }}>{cat.icon}</span>}
                    {cat.name}
                  </div>
                </div>
                <Button appearance="subtle" size="small" icon={<EditRegular />} onClick={() => openEdit(cat)} />
                <Button
                  appearance="subtle" size="small" icon={<DeleteRegular />}
                  onClick={() => removeCategory(cat.id)} style={{ color: '#e74856' }}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editId ? t('manage.editCategory') : t('manage.addCategory')}</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.name')} *</label>
                  <Input value={name} onChange={(_, data) => setName(data.value)} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.color')}</label>
                  <ColorPicker value={color} onChange={setColor} />
                </div>
                <div className="form-field">
                  <label style={{ fontWeight: 600, fontSize: 13 }}>{t('manage.icon')}</label>
                  <Input
                    value={icon}
                    onChange={(_, data) => setIcon(data.value)}
                    placeholder={t('manage.iconPlaceholder')}
                    style={{ width: 120 }}
                  />
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{t('common.cancel')}</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleSave} disabled={!name}>
                {t('common.save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
}

// ==================== Tags ====================
function TagsSection() {
  const { t } = useTranslation();
  const { tags, addTag, removeTag } = useDataStore();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_PALETTE[0]);

  const handleAdd = async () => {
    if (!newTagName.trim()) return;
    const tagName = newTagName.startsWith('#') ? newTagName : `#${newTagName}`;
    await addTag({ name: tagName, color: newTagColor });
    setNewTagName('');
    setNewTagColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input
            value={newTagName}
            onChange={(_, data) => setNewTagName(data.value)}
            placeholder={t('manage.addTagPlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{ width: '100%' }}
          />
        </div>
        <Button appearance="primary" icon={<AddRegular />} onClick={handleAdd} disabled={!newTagName.trim()}>
          {t('common.add')}
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>{t('manage.color')}</label>
        <ColorPicker value={newTagColor} onChange={setNewTagColor} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="tag-chip"
            style={{ background: `${tag.color}20`, color: tag.color, padding: '6px 12px', display: 'flex', alignItems: 'center', borderRadius: 16 }}
          >
            {tag.name}
            <Button
              appearance="subtle"
              size="small"
              icon={<DeleteRegular style={{ fontSize: 12 }} />}
              onClick={() => removeTag(tag.id)}
              style={{ minWidth: 'auto', padding: '0 2px', marginLeft: 4 }}
            />
          </div>
        ))}
        {tags.length === 0 && (
          <div style={{ color: tokens.colorNeutralForeground3, padding: 20 }}>{t('common.noData')}</div>
        )}
      </div>
    </>
  );
}
