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
