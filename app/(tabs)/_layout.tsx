import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

// 🎨 Tema centralizado
const theme = {
  colors: {
    active: '#FAB12F',
    inactive: '#666666',
    background: '#1A1A1A',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  sizes: {
    tabHeight: 70,
    tabRadius: 16,
    iconSize: 24,
  },
};



export default function TabsContainer() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.active,
        tabBarInactiveTintColor: theme.colors.inactive,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          borderRadius: theme.sizes.tabRadius,
          marginHorizontal: 20,
          marginBottom: 20,
          height: theme.sizes.tabHeight,
          paddingBottom: 34,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      {/* 🏠 Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 💪 Training */}
      <Tabs.Screen
        name="training"
        options={{
          title: 'Training',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'fitness' : 'fitness-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* ⏱️ Timer */}
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Timer',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stopwatch' : 'stopwatch-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 🏆 Ranking */}
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

      {/* 👤 Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={theme.sizes.iconSize} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}


