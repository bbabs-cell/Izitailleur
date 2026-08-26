import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { CustomersListScreen } from "../screens/CustomersListScreen";
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { CustomerFormScreen } from "../screens/CustomerFormScreen";
import { MeasurementProfileFormScreen } from "../screens/MeasurementProfileFormScreen";
import { OrdersListScreen } from "../screens/OrdersListScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { OrderFormScreen } from "../screens/OrderFormScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { TeamListScreen } from "../screens/TeamListScreen";
import { TeamInviteScreen } from "../screens/TeamInviteScreen";
import { FabricsListScreen } from "../screens/FabricsListScreen";
import { FabricFormScreen } from "../screens/FabricFormScreen";
import { FabricDetailScreen } from "../screens/FabricDetailScreen";
import { SuppliersListScreen } from "../screens/SuppliersListScreen";
import { IssuesListScreen } from "../screens/IssuesListScreen";
import { IssueFormScreen } from "../screens/IssueFormScreen";
import { colors } from "../theme/tokens";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Customers: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: undefined;
  MeasurementProfileForm: { customerId: string };
  Orders: undefined;
  OrderDetail: { orderId: string };
  OrderForm: { customerId?: string };
  Calendar: undefined;
  Team: undefined;
  TeamInvite: undefined;
  Fabrics: undefined;
  FabricForm: undefined;
  FabricDetail: { fabricId: string };
  Suppliers: undefined;
  Issues: undefined;
  IssueForm: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

export function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {status === "authenticated" ? (
        <AppStack.Navigator screenOptions={{ headerTintColor: colors.textPrimary }}>
          <AppStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <AppStack.Screen name="Customers" component={CustomersListScreen} options={{ title: "Clients" }} />
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
          <AppStack.Screen name="Orders" component={OrdersListScreen} options={{ title: "Commandes" }} />
          <AppStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Commande" }} />
          <AppStack.Screen
            name="OrderForm"
            component={OrderFormScreen}
            options={{ title: "Nouvelle commande" }}
          />
          <AppStack.Screen name="Calendar" component={CalendarScreen} options={{ title: "Calendrier" }} />
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
        </AppStack.Navigator>
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
    backgroundColor: colors.background,
  },
});
