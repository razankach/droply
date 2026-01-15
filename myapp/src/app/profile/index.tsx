import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  
  const userName = user?.user_metadata?.full_name || 'User';
  const userEmail = user?.email || 'N/A';
  const userPhone = user?.user_metadata?.phone || 'N/A';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';

  const handleLogout = () => {
    logout();
    setTimeout(() => {
        router.replace('/auth');
    }, 100);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editButton}>
            <Feather name="edit-2" size={20} color="#4A148C" />
        </TouchableOpacity>
      </View>

      {/* Profile Info Card */}
      <View style={styles.profileCard}>
         <View style={styles.avatarContainer}>
             <View style={styles.avatar}>
                 <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
             </View>
             <View style={styles.onlineBadge} />
         </View>
         <Text style={styles.name}>{userName}</Text>
         <Text style={styles.role}>Verified Member</Text>
      </View>

      {/* Details Section */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoItem}>
              <View style={styles.iconBox}>
                  <Feather name="mail" size={20} color="#7B1FA2" />
              </View>
              <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{userEmail}</Text>
              </View>
          </View>

          <View style={styles.infoItem}>
              <View style={styles.iconBox}>
                  <Feather name="phone" size={20} color="#7B1FA2" />
              </View>
              <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{userPhone}</Text>
              </View>
          </View>

          <View style={styles.infoItem}>
              <View style={styles.iconBox}>
                  <Feather name="calendar" size={20} color="#7B1FA2" />
              </View>
              <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>{memberSince}</Text>
              </View>
          </View>
      </View>

      {/* Account Settings Section */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/coming-soon' as any)}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}> 
                <Ionicons name="notifications-outline" size={22} color="#555" />
                <Text style={styles.optionText}>Notifications</Text>
             </View>
             <Feather name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/coming-soon' as any)}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}> 
                <Ionicons name="lock-closed-outline" size={22} color="#555" />
                <Text style={styles.optionText}>Privacy & Security</Text>
             </View>
             <Feather name="chevron-right" size={20} color="#CCC" />
          </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1BEE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  profileCard: {
      alignItems: 'center',
      marginBottom: 30,
  },
  avatarContainer: {
      position: 'relative',
      marginBottom: 16,
  },
  avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#E1BEE7',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#FFF',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
  },
  avatarText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: '#4A148C',
  },
  onlineBadge: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#4CAF50',
      borderWidth: 3,
      borderColor: '#FFF',
  },
  name: {
      fontSize: 24,
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: 4,
  },
  role: {
      fontSize: 14,
      color: '#7B1FA2',
      fontWeight: '600',
      backgroundColor: '#F3E5F5',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
  },
  
  section: {
      marginBottom: 25,
      backgroundColor: '#FFF',
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#333',
      marginBottom: 16,
  },
  infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
  },
  iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#F3E5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  infoContent: {
      flex: 1,
  },
  infoLabel: {
      fontSize: 12,
      color: '#888',
      marginBottom: 2,
  },
  infoValue: {
      fontSize: 15,
      color: '#333',
      fontWeight: '500',
  },
  optionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
  },
  optionText: {
      fontSize: 16,
      color: '#333',
      marginLeft: 12,
  },
  
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEBEE', 
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    marginLeft: 8,
  },
});
