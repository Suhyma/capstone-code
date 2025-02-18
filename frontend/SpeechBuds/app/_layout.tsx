import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/*
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="ChildHomeScreen" options={{ title: 'About' }} />
      */}

      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="ChildHomeScreen" options={{ title: 'About' }} />
      <Stack.Screen name="SLPHomeScreen" options={{ title: 'About' }} />
      <Stack.Screen name="ExerciseScreen1" options={{ title: 'About' }} />
    </Stack>
  );
}
