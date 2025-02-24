import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="Registration" options={{ title: 'Registration' }} />
      <Stack.Screen name="Login" options={{ title: 'Login' }} />
      <Stack.Screen name="ChildHomeScreen" options={{ title: 'Child Home Screen' }} />
      <Stack.Screen name="SLPHomeScreen" options={{ title: 'SLP Home Screen' }} />
      <Stack.Screen name="ExerciseScreen1" options={{ title: 'Example Video' }} />
      <Stack.Screen name="ExerciseScreen2" options={{ title: 'Record' }} />
      <Stack.Screen name="ExerciseScreen3" options={{ title: 'Feedback' }} />
    </Stack>
  );
}