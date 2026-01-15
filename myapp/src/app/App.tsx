// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Index from './index';
import Dashboard from './dashboard/index';
import Service from './service/index';

type RootStackParamList = {
  Home: undefined;
  Dashboard: undefined;
  Service: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={Index} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Service" component={Service} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}