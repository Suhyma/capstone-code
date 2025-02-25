import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { StackParamList } from "../types";

export function useNavigate() {
  const navigation = useNavigation<StackNavigationProp<StackParamList>>();

  // Correctly type params based on screenName
  const navigateTo = <T extends keyof StackParamList>(
    screenName: T,
    params?: StackParamList[T]
  ) => {
    navigation.navigate(screenName, params as any); // Safe cast to any if needed
  };

  return { navigateTo };
}
