import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../auth/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { CustomerFormScreen } from "../screens/CustomerFormScreen";
import { MeasurementProfileFormScreen } from "../screens/MeasurementProfileFormScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { OrderFormScreen } from "../screens/OrderFormScreen";
import { AppointmentFormScreen } from "../screens/AppointmentFormScreen";
import { TeamListScreen } from "../screens/TeamListScreen";
import { TeamInviteScreen } from "../screens/TeamInviteScreen";
import { FabricsListScreen } from "../screens/FabricsListScreen";
import { FabricFormScreen } from "../screens/FabricFormScreen";
import { FabricDetailScreen } from "../screens/FabricDetailScreen";
import { SuppliersListScreen } from "../screens/SuppliersListScreen";
import { IssuesListScreen } from "../screens/IssuesListScreen";
import { IssueFormScreen } from "../screens/IssueFormScreen";
import { OrderPaymentsScreen } from "../screens/OrderPaymentsScreen";
import { DebtsScreen } from "../screens/DebtsScreen";
import { FinanceStatsScreen } from "../screens/FinanceStatsScreen";
import { SyncStatusScreen } from "../screens/SyncStatusScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { AssistantScreen } from "../screens/AssistantScreen";
import { WorkshopSettingsScreen } from "../screens/WorkshopSettingsScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { ReceiptScreen } from "../screens/ReceiptScreen";
import { SubscriptionScreen } from "../screens/SubscriptionScreen";
import { ModelsListScreen } from "../screens/ModelsListScreen";
import { ModelFormScreen } from "../screens/ModelFormScreen";
import { ModelDetailScreen } from "../screens/ModelDetailScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { SyncProvider } from "../offline/SyncContext";
import { useTheme } from "../theme/ThemeContext";
import { MainTabs } from "./MainTabs";

const ONBOARDING_SEEN_KEY = "izitailleur_onboarding_seen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/**
 * Home/Orders/Calendar/Customers/More vivent réellement dans MainTabs (bottom-tabs),
 * mais restent typés ici : React Navigation résout la navigation vers un écran
 * imbriqué par son nom depuis n'importe quel écran de la pile tant que MainTabs est
 * monté, ce qui évite de réécrire tous les appels navigation.navigate existants.
 */
export type AppStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Customers: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: undefined;
  MeasurementProfileForm: { customerId: string };
  Orders: undefined;
  OrderDetail: { orderId: string };
  OrderForm: { customerId?: string; modelName?: string };
  Calendar: undefined;
  AppointmentForm: undefined;
  Team: undefined;
  TeamInvite: undefined;
  Fabrics: undefined;
  FabricForm: undefined;
  FabricDetail: { fabricId: string };
  Suppliers: undefined;
  Issues: undefined;
  IssueForm: undefined;
  OrderPayments: { orderId: string };
  Receipt: { receiptId: string };
  Debts: undefined;
  FinanceStats: undefined;
  SyncStatus: undefined;
  Notifications: undefined;
  Assistant: undefined;
  WorkshopSettings: undefined;
  More: undefined;
  Search: undefined;
  Settings: undefined;
  Subscription: undefined;
  Models: undefined;
  ModelForm: undefined;
  ModelDetail: { modelId: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { status } = useAuth();
  const { colors, scheme } = useTheme();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_SEEN_KEY)
      .then((value) => setOnboardingSeen(value === "1"))
      .catch(() => setOnboardingSeen(true));
  }, []);

  const navTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.accent,
    },
  };

  if (status === "loading" || onboardingSeen === null) {
    return <SplashScreen />;
  }

  if (status === "unauthenticated" && !onboardingSeen) {
    return (
      <View style={styles.loading}>
        <OnboardingScreen
          onDone={() => {
            setOnboardingSeen(true);
            SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, "1").catch(() => undefined);
          }}
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {status === "authenticated" ? (
        <SyncProvider>
          <AppStack.Navigator screenOptions={{ headerTintColor: colors.textPrimary }}>
            <AppStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <AppStack.Screen
              name="CustomerDetail"
              component={CustomerDetailScreen}
              options={{ title: "Client" }}
            />
            <AppStack.Screen
              name="CustomerForm"
              component={CustomerFormScreen}
              options={{ title: "Nouveau client" }}
            />
            <AppStack.Screen
              name="MeasurementProfileForm"
              component={MeasurementProfileFormScreen}
              options={{ title: "Mensurations" }}
            />
            <AppStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Commande" }} />
            <AppStack.Screen
              name="OrderForm"
              component={OrderFormScreen}
              options={{ title: "Nouvelle commande" }}
            />
            <AppStack.Screen
              name="AppointmentForm"
              component={AppointmentFormScreen}
              options={{ title: "Nouveau rendez-vous" }}
            />
            <AppStack.Screen name="Team" component={TeamListScreen} options={{ title: "Équipe" }} />
            <AppStack.Screen
              name="TeamInvite"
              component={TeamInviteScreen}
              options={{ title: "Inviter un membre" }}
            />
            <AppStack.Screen name="Fabrics" component={FabricsListScreen} options={{ title: "Tissus" }} />
            <AppStack.Screen
              name="FabricForm"
              component={FabricFormScreen}
              options={{ title: "Nouveau tissu" }}
            />
            <AppStack.Screen
              name="FabricDetail"
              component={FabricDetailScreen}
              options={{ title: "Tissu" }}
            />
            <AppStack.Screen
              name="Suppliers"
              component={SuppliersListScreen}
              options={{ title: "Fournisseurs" }}
            />
            <AppStack.Screen name="Issues" component={IssuesListScreen} options={{ title: "Problèmes" }} />
            <AppStack.Screen
              name="IssueForm"
              component={IssueFormScreen}
              options={{ title: "Signaler un problème" }}
            />
            <AppStack.Screen
              name="OrderPayments"
              component={OrderPaymentsScreen}
              options={{ title: "Paiements" }}
            />
            <AppStack.Screen name="Receipt" component={ReceiptScreen} options={{ title: "Reçu" }} />
            <AppStack.Screen
              name="Debts"
              component={DebtsScreen}
              options={{ title: "Argent à récupérer" }}
            />
            <AppStack.Screen
              name="FinanceStats"
              component={FinanceStatsScreen}
              options={{ title: "Statistiques" }}
            />
            <AppStack.Screen
              name="SyncStatus"
              component={SyncStatusScreen}
              options={{ title: "Synchronisation" }}
            />
            <AppStack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: "Notifications" }}
            />
            <AppStack.Screen
              name="Assistant"
              component={AssistantScreen}
              options={{ title: "Assistant" }}
            />
            <AppStack.Screen
              name="WorkshopSettings"
              component={WorkshopSettingsScreen}
              options={{ title: "Paramètres de l'atelier" }}
            />
            <AppStack.Screen
              name="Search"
              component={SearchScreen}
              options={{ title: "Recherche" }}
            />
            <AppStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: "Apparence & langue" }}
            />
            <AppStack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ title: "Abonnement" }}
            />
            <AppStack.Screen name="Models" component={ModelsListScreen} options={{ title: "Modèles" }} />
            <AppStack.Screen
              name="ModelForm"
              component={ModelFormScreen}
              options={{ title: "Nouveau modèle" }}
            />
            <AppStack.Screen
              name="ModelDetail"
              component={ModelDetailScreen}
              options={{ title: "Modèle" }}
            />
          </AppStack.Navigator>
        </SyncProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
