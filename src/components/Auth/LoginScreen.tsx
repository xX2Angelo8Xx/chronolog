import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Card,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import {
  PersonRegular,
  AddRegular,
  LockClosedRegular,
  ArrowLeftRegular,
  EyeRegular,
  EyeOffRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/types';

type View = 'profiles' | 'login' | 'create';

const AVATAR_COLORS = [
  '#0078d4', '#2b88d8', '#00bcf2', '#00b294',
  '#498205', '#107c10', '#7a7574', '#5c2d91',
  '#b4009e', '#e3008c', '#d13438', '#ca5010',
  '#ffb900', '#8764b8', '#038387', '#647c64',
];

export function LoginScreen() {
  const { t } = useTranslation();
  const { users, loadUsers, login, createUser } = useUserStore();

  const [view, setView] = useState<View>('profiles');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [newAvatarColor, setNewAvatarColor] = useState(AVATAR_COLORS[0]);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Auto-select if only one user with empty password
  useEffect(() => {
    if (users.length === 1 && view === 'profiles') {
      handleSelectUser(users[0]);
    }
  }, [users]);

  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setPassword('');
    setError('');
    setView('login');
  }, []);

  const handleLogin = useCallback(async () => {
    if (!selectedUser) return;

    setIsLoggingIn(true);
    setError('');

    const success = await login(selectedUser.id, password);
    if (!success) {
      setError(t('auth.wrongPassword'));
    }
    setIsLoggingIn(false);
  }, [selectedUser, password, login, t]);

  const handleCreate = useCallback(async () => {
    setCreateError('');

    if (!newName.trim()) {
      setCreateError(t('auth.nameRequired'));
      return;
    }
    if (!newPassword) {
      setCreateError(t('auth.passwordRequired'));
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setCreateError(t('auth.passwordMismatch'));
      return;
    }

    setIsCreating(true);
    const user = await createUser(newName.trim(), newDisplayName.trim(), newPassword, newAvatarColor);
    setIsCreating(false);

    if (user) {
      // Reset form and go back to profiles
      setNewName('');
      setNewDisplayName('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setNewAvatarColor(AVATAR_COLORS[0]);
      setView('profiles');
    }
  }, [newName, newDisplayName, newPassword, newPasswordConfirm, newAvatarColor, createUser, t]);

  const handleBack = useCallback(() => {
    setView('profiles');
    setSelectedUser(null);
    setPassword('');
    setError('');
    setCreateError('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (view === 'login') handleLogin();
        if (view === 'create') handleCreate();
      }
      if (e.key === 'Escape') {
        handleBack();
      }
    },
    [view, handleLogin, handleCreate, handleBack],
  );

  return (
    <div style={styles.container} onKeyDown={handleKeyDown}>
      {/* Background gradient */}
      <div style={styles.bgGlow} />

      {/* Logo / App name */}
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>
          <svg width="48" height="48" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="url(#grad)" strokeWidth="4" />
            <line x1="40" y1="40" x2="40" y2="20" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
            <line x1="40" y1="40" x2="56" y2="40" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="40" r="3" fill="#818cf8" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="80" y2="80">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 style={styles.appName}>{t('app.name')}</h1>
        <p style={styles.tagline}>{t('app.tagline')}</p>
      </div>

      {/* Content area */}
      <div style={styles.content}>
        {view === 'profiles' && (
          <div style={styles.fadeIn}>
            <h2 style={styles.heading}>{t('auth.selectProfile')}</h2>

            {users.length === 0 ? (
              <p style={styles.noUsers}>{t('auth.createProfile')}</p>
            ) : (
              <div style={styles.profileGrid}>
                {users.map((user) => (
                  <Card
                    key={user.id}
                    style={styles.profileCard}
                    onClick={() => handleSelectUser(user)}
                    appearance="subtle"
                  >
                    <div style={styles.profileCardInner}>
                      <div
                        style={{
                          ...styles.avatar,
                          backgroundColor: user.avatar_color || '#0078d4',
                        }}
                      >
                        <span style={styles.avatarLetter}>
                          {(user.display_name || user.name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span style={styles.profileName}>
                        {user.display_name || user.name}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <Button
              appearance="subtle"
              icon={<AddRegular />}
              style={styles.createButton}
              onClick={() => setView('create')}
            >
              {t('auth.createProfile')}
            </Button>
          </div>
        )}

        {view === 'login' && selectedUser && (
          <div style={styles.fadeIn}>
            <Button
              appearance="subtle"
              icon={<ArrowLeftRegular />}
              style={styles.backButton}
              onClick={handleBack}
              size="small"
            >
              {t('common.back')}
            </Button>

            <div style={styles.loginUser}>
              <div
                style={{
                  ...styles.avatarLarge,
                  backgroundColor: selectedUser.avatar_color || '#0078d4',
                }}
              >
                <span style={styles.avatarLetterLarge}>
                  {(selectedUser.display_name || selectedUser.name || '?')[0].toUpperCase()}
                </span>
              </div>
              <h2 style={styles.welcomeName}>
                {t('auth.welcome')}, {selectedUser.display_name || selectedUser.name}
              </h2>
            </div>

            <div style={styles.inputGroup}>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                value={password}
                onChange={(_, data) => {
                  setPassword(data.value);
                  setError('');
                }}
                contentBefore={<LockClosedRegular />}
                contentAfter={
                  <Button
                    appearance="transparent"
                    icon={showPassword ? <EyeOffRegular /> : <EyeRegular />}
                    onClick={() => setShowPassword(!showPassword)}
                    size="small"
                    style={{ minWidth: 'auto' }}
                  />
                }
                style={styles.input}
                autoFocus
              />
              {error && <p style={styles.errorText}>{error}</p>}
            </div>

            <Button
              appearance="primary"
              style={styles.loginButton}
              onClick={handleLogin}
              disabled={isLoggingIn}
              icon={isLoggingIn ? <Spinner size="tiny" /> : undefined}
            >
              {t('auth.login')}
            </Button>
          </div>
        )}

        {view === 'create' && (
          <div style={styles.fadeIn}>
            <Button
              appearance="subtle"
              icon={<ArrowLeftRegular />}
              style={styles.backButton}
              onClick={handleBack}
              size="small"
            >
              {t('common.back')}
            </Button>

            <h2 style={styles.heading}>
              <PersonRegular style={{ marginRight: 8 }} />
              {t('auth.createProfile')}
            </h2>

            <div style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t('auth.name')}</label>
                <Input
                  value={newName}
                  onChange={(_, data) => {
                    setNewName(data.value);
                    setCreateError('');
                  }}
                  placeholder={t('auth.name')}
                  style={styles.input}
                  autoFocus
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>{t('auth.displayName')}</label>
                <Input
                  value={newDisplayName}
                  onChange={(_, data) => setNewDisplayName(data.value)}
                  placeholder={t('auth.displayName')}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>{t('auth.password')}</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(_, data) => {
                    setNewPassword(data.value);
                    setCreateError('');
                  }}
                  placeholder={t('auth.password')}
                  contentBefore={<LockClosedRegular />}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>{t('auth.confirmPassword')}</label>
                <Input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(_, data) => {
                    setNewPasswordConfirm(data.value);
                    setCreateError('');
                  }}
                  placeholder={t('auth.confirmPassword')}
                  contentBefore={<LockClosedRegular />}
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>{t('manage.color')}</label>
                <div style={styles.colorPicker}>
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewAvatarColor(color)}
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: color,
                        outline: newAvatarColor === color ? `2px solid ${color}` : 'none',
                        outlineOffset: newAvatarColor === color ? '2px' : '0',
                        transform: newAvatarColor === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {newAvatarColor === color && (
                        <CheckmarkRegular style={{ color: '#fff', fontSize: 14 }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {createError && <p style={styles.errorText}>{createError}</p>}

              <Button
                appearance="primary"
                style={styles.loginButton}
                onClick={handleCreate}
                disabled={isCreating}
                icon={isCreating ? <Spinner size="tiny" /> : <AddRegular />}
              >
                {t('auth.create')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Styles ====================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #1a1a2e 100%)',
    fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 500,
    height: 500,
    transform: 'translate(-50%, -50%)',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 36,
    animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  logoIcon: {
    marginBottom: 12,
    filter: 'drop-shadow(0 0 16px rgba(99, 102, 241, 0.35))',
  },
  appName: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e2e8f0',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.7)',
    marginTop: 4,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    padding: '0 24px',
  },
  fadeIn: {
    animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    textAlign: 'center' as const,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noUsers: {
    color: 'rgba(148, 163, 184, 0.6)',
    textAlign: 'center' as const,
    fontSize: 14,
    marginBottom: 16,
  },
  profileGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  profileCard: {
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: '12px 16px',
    transition: 'all 0.2s ease',
    // Hover handled via onMouseEnter/Leave or CSS
  },
  profileCardInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
  },
  profileName: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: 500,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    marginBottom: 12,
  },
  avatarLetterLarge: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1,
  },
  loginUser: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    margin: 0,
  },
  backButton: {
    color: 'rgba(148, 163, 184, 0.7)',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
    width: '100%',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(148, 163, 184, 0.8)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 0,
  },
  loginButton: {
    width: '100%',
    marginTop: 8,
    height: 40,
    fontWeight: 600,
  },
  createButton: {
    width: '100%',
    color: 'rgba(148, 163, 184, 0.6)',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  colorPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease, outline 0.15s ease',
    padding: 0,
  },
};

// Inject keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
if (!document.querySelector('[data-login-animations]')) {
  styleSheet.setAttribute('data-login-animations', '');
  document.head.appendChild(styleSheet);
}
