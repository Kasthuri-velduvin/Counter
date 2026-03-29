/**
 * App.tsx — root entry point
 * Renders AppNavigator which ties all screens together.
 * Requirements: 16.1
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/ui/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <AppNavigator />
    </>
  );
}
