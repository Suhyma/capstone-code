import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import Index from './index';
import Login from './Login';
import { StackParamList } from './types';
import ChildHomeScreen from './ChildHomeScreen'
import Demo from './Demo';
import Feedback from './Feedback';
import Record from './Record';
import Record_CV from './Record_CV';
import SLPHomeScreen from './SLPHomeScreen';
import Clients from './Clients';
import Exercises from './Exercises';

const Stack = createStackNavigator<StackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Index" component={Index} options={{ title: 'Home' }} />
        <Stack.Screen name="Login" component={Login} options={{ title: 'Login' }} />
        <Stack.Screen name="ChildHomeScreen" component={ChildHomeScreen} options={{ title: 'Child Home Screen' }} />
        <Stack.Screen name="SLPHomeScreen" component={SLPHomeScreen} options={{ title: 'SLP Home Screen' }} />
        <Stack.Screen name="Demo" component={Demo} options={{ title: 'Example Video' }} />
        <Stack.Screen name="Record" component={Record} options={{ title: 'Record' }} />
        <Stack.Screen name="Record_CV" component={Record_CV} options={{ title: 'Record_CV' }} />
        <Stack.Screen name="Feedback" component={Feedback} options={{ title: 'Feedback' }} />
        <Stack.Screen name="Clients" component={Clients} options={{ title: 'Clients'}} />
        <Stack.Screen name="Exercises" component={Exercises} options={{ title: 'Exercises'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
