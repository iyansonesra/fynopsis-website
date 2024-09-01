import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';

const createMuiTheme = (mode: any) => {
  return createTheme({
    palette: {
      mode: mode,
      ...(mode === 'dark' ? {
        background: {
          default: '#1a1b1e',
          paper: '#2b2c2f',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b0b0b0',
        },
      } : {
        // Your light theme colors
      }),
    },
  });
};

export const MuiThemeProvider = ({ children }: any) => {
  const { resolvedTheme } = useTheme();
  const muiTheme = createMuiTheme(resolvedTheme === 'dark' ? 'dark' : 'light');

  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
};