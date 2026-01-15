import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

const { height } = Dimensions.get('window');

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const slideAnim = useRef(new Animated.Value(-300)).current; 
  
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Guest';

  useEffect(() => {
    const toValue = isOpen ? 0 : -300;
    
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
  }, [isOpen]);

  const menuItems = [
    { id: 1, label: 'Home', icon: 'home', route: '/home' },
    { id: 2, label: 'Packages', icon: 'package', route: '/dashboard?view=sent' },
    { id: 3, label: 'Deliveries', icon: 'truck', route: '/dashboard?view=deliveries' },
    { id: 6, label: 'Profile', icon: 'user', route: '/profile' },
  ];

  return (
    <>
      {/* Overlay Background */}
      {isOpen && (
        <Animated.View 
            style={[styles.overlay]}
        >
             <TouchableOpacity 
                style={StyleSheet.absoluteFill} 
                activeOpacity={1} 
                onPress={onClose} 
            />
        </Animated.View>
      )}

      {/* Sidebar Content */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        
        {/* Close Button inside Sidebar */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="#666" />
        </TouchableOpacity>

        <View style={styles.header}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {userName[0]}
                </Text>
            </View>
            <View>
                <Text style={styles.greeting}>Hello,</Text>
                <Text style={styles.username}>{userName}</Text>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.menuContainer}>
            {menuItems.map((item) => (
            <TouchableOpacity 
                key={item.id} 
                style={styles.menuItem}
                onPress={() => {
                    if (item.route) router.push(item.route as any);
                    onClose();
                }}
            >
                <Feather name={item.icon as any} size={20} color="#666" style={styles.menuIcon} />
                <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
            ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => {/* Add logout logic */}}>
            <Feather name="log-out" size={20} color="#FF3B30" style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: '#FF3B30' }]}>Logout</Text>
        </TouchableOpacity>

      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 900,
    elevation: 900,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFF',
    paddingTop: 60,
    paddingHorizontal: 24,
    zIndex: 1100, 
    elevation: 1100,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  closeButton: {
    position: 'absolute',
    top: 45,
    right: 20,
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8E24AA',
  },
  greeting: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 24,
  },
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    marginRight: 16,
    color: '#555',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 20,
  },
});
