import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/HomeScreen";
import { OrdersListScreen } from "../screens/OrdersListScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { CustomersListScreen } from "../screens/CustomersListScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { useTheme } from "../theme/ThemeContext";

export type MainTabsParamList = {
  Home: undefined;
  Orders: undefined;
  Calendar: undefined;
  Customers: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<keyof MainTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Orders: "shirt",
  Calendar: "calendar",
  Customers: "people",
  More: "menu",
};

export function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? ICONS[route.name as keyof MainTabsParamList] : (`${ICONS[route.name as keyof MainTabsParamList]}-outline` as keyof typeof Ionicons.glyphMap)}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Accueil" }} />
      <Tab.Screen name="Orders" component={OrdersListScreen} options={{ title: "Commandes" }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: "Calendrier" }} />
      <Tab.Screen name="Customers" component={CustomersListScreen} options={{ title: "Clients" }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: "Plus" }} />
    </Tab.Navigator>
  );
}
