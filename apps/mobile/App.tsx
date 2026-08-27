import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ThemeProvider } from "./src/theme/ThemeContext";
import { I18nProvider } from "./src/i18n/I18nContext";

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
