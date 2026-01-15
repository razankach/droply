import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Home() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Droply User';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Get current greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.mainContainer}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        {/* Header Section */}
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {/* Hamburger Menu Button */}
                <TouchableOpacity 
                    style={styles.menuButton} 
                    onPress={() => setIsSidebarOpen(true)}
                    activeOpacity={0.7}
                >
                    <Feather name="menu" size={24} color="#1A1A1A" />
                </TouchableOpacity>

                <View style={styles.greetingContainer}>
                  <Text style={styles.greeting}>{getGreeting()},</Text>
                  <Text style={styles.userName}>{userName}</Text>
                </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileButton}>
               <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{userName[0]}</Text>
               </View>
               <View style={styles.onlineBadge} />
            </TouchableOpacity>
        </View>

        {/* Main Action Grid */}
        <View style={styles.gridContainer}>
            {/* Dashboard - Big Card */}
            <TouchableOpacity 
              style={[styles.card, styles.dashboardCard]}
              onPress={() => router.push('/dashboard')}
              activeOpacity={0.9}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <MaterialCommunityIcons name="view-dashboard" size={32} color="#4A148C" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Dashboard</Text>
                  <Text style={styles.cardSubtitle}>View stats & analytics</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="arrow-right-circle" size={24} color="#4A148C" style={styles.arrowIcon} />
            </TouchableOpacity>

            <View style={styles.rowActions}>
              {/* Send Package */}
              <TouchableOpacity 
                style={[styles.smallCard, styles.purpleCard]}
                onPress={() => router.push('/send-package' as any)}
                activeOpacity={0.9}
              >
                 <View style={styles.smallCardIcon}>
                    <FontAwesome5 name="box-open" size={24} color="#5E35B1" />
                 </View>
                 <Text style={styles.smallCardText}>Send Package</Text>
              </TouchableOpacity>

              {/* Deliver Package */}
              <TouchableOpacity 
                style={[styles.smallCard, styles.pinkCard]}
                onPress={() => router.push('/deliver-package')}
                activeOpacity={0.9}
              >
                  <View style={styles.smallCardIcon}>
                    <MaterialCommunityIcons name="truck-delivery" size={28} color="#C2185B" />
                  </View>
                  <Text style={styles.smallCardText}>Deliver Package</Text>
              </TouchableOpacity>
            </View>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
            {[
              { name: "Droply Map", icon: "map-outline", route: "/droply-map" },
              { name: "Track Package", icon: "cube-outline", route: "/track-package" },
              { name: "Promotions", icon: "pricetag-outline", route: "/coming-soon" },
              { name: "Support", icon: "headset-outline", route: "/coming-soon" }
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.serviceItem}
                activeOpacity={0.8}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.serviceIconContainer}>
                   <Ionicons name={item.icon as any} size={24} color="#333" />
                </View>
                <Text style={styles.serviceText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity / Updates (New Section) */}
        <View style={styles.activitySection}>
           <Text style={styles.sectionTitle}>Recent Updates</Text>
           <View style={styles.infoCard}>
             <Ionicons name="sparkles" size={40} color="#7B1FA2" />
             <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>New Features Added! </Text>
                <Text style={styles.infoDesc}>
                  • Track Package: Monitor all in-transit deliveries{'\n'}
                  • Improved Send Package UI with type selector{'\n'}
                  • Phone number input for recipients{'\n'}
                  • Map centers on your location{'\n'}
                  • Color-coded package status badges
                </Text>
             </View>
           </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB', 
  },
  container: {
    padding: 24,
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 45,
    height: 45,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  greetingContainer: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800', 
    color: '#1A1A1A',
  },
  profileButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#E1BEE7', // Light Purple
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarText: {
    color: '#4A148C', // Deep Purple
    fontSize: 22,
    fontWeight: 'bold',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  gridContainer: {
    marginBottom: 30,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dashboardCard: {
    height: 160,
    backgroundColor: '#E1BEE7', 
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A148C',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#7B1FA2',
    opacity: 0.8,
  },
  arrowIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    width: '48%',
    height: 140,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  purpleCard: {
    backgroundColor: '#EDE7F6', 
    borderWidth: 1,
    borderColor: '#D1C4E9',
  },
  pinkCard: {
    backgroundColor: '#FCE4EC', 
    borderWidth: 1,
    borderColor: '#F8BBD0',
  },
  smallCardIcon: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 50,
  },
  smallCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  servicesSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  servicesScroll: {
    paddingLeft: 4, 
    marginHorizontal: -4, 
  },
  serviceItem: {
    marginRight: 16,
    alignItems: 'center',
    width: 80,
  },
  serviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  serviceText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },
  activitySection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
