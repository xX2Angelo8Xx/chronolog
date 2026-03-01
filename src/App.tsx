import { useEffect } from 'react';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { useAppStore } from '@/stores/appStore';
import { useTimerStore } from '@/stores/timerStore';
import { useDataStore } from '@/stores/dataStore';
import { useUserStore } from '@/stores/userStore';
import { AppLayout } from '@/components/Layout/AppLayout';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { LoginScreen } from '@/components/Auth/LoginScreen';

function App() {
  const { resolvedTheme, loadSettings, setResolvedTheme } = useAppStore();
  const { loadRunningEntry, tick } = useTimerStore();
  const { loadAll } = useDataStore();
  const { isAuthenticated } = useUserStore();

  useEffect(() => {
    // Initialize app
    const init = async () => {
      await loadSettings();
      await useUserStore.getState().loadUsers();
      await loadAll();
      await loadRunningEntry();
    };
    init();

    // Listen for theme changes
    const unsubTheme = window.electronAPI.theme.onChanged((theme) => {
      setResolvedTheme(theme);
    });

    // Timer tick interval (1 second)
    const tickInterval = setInterval(() => {
      tick();
    }, 1000);

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Detect initial system theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setResolvedTheme(prefersDark ? 'dark' : 'light');

    return () => {
      unsubTheme();
      clearInterval(tickInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const theme = resolvedTheme === 'dark' ? webDarkTheme : webLightTheme;

  return (
    <FluentProvider theme={theme} style={{ height: '100%' }}>
      {isAuthenticated ? (
        <>
          <AppLayout />
          <CommandPalette />
        </>
      ) : (
        <LoginScreen />
      )}
    </FluentProvider>
  );
}

export default App;
