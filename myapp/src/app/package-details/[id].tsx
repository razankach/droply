import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import TrackingMap from '../../components/TrackingMap';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { useAuth } from '../../context/AuthContext';

export default function PackageDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     if (id) fetchPackageDetails();
  }, [id]);

  const fetchPackageDetails = async () => {
    try {
        const { data, error } = await supabase
            .from('packages')
            .select('*, sender:sender_id(full_name, phone_number), deliverer:deliverer_id(full_name, phone_number)')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        setPackageData(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return '#FFA000'; // Amber
        case 'in_transit': return '#2196F3'; // Blue
        case 'delivered': return '#4CAF50'; // Green
        case 'cancelled': return '#F44336'; // Red
        default: return '#757575';
    }
  };

  const getStatusLabel = (status: string) => status?.replace('_', ' ').toUpperCase();

  if (loading) {
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A148C" />
          </View>
      );
  }

  if (!packageData) {
      return (
          <View style={styles.loadingContainer}>
              <Text>Package not found.</Text>
              <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                  <Text style={{ color: '#4A148C' }}>Go Back</Text>
              </TouchableOpacity>
          </View>
      );
  }

  // Generate Map HTML with markers for Pickup (Green) and Dropoff (Red)
  // We'll trust the coordinate strings if available, otherwise we can't map easily without geocoding again.
  // Ideally, we should have stored coords. For now, we'll just show a placeholder map or center it.
  // Actually, let's reverse geocode the addresses solely for display if we don't have coords?
  // Simpler: Just render a static helpful map or similar.
  // Since we don't have coords stored in the DB (only addresses string), we can't easily show markers without geocoding.
  // Let's show a nice "Route" UI instead of a map to avoid complexity/errors, or just a generic map.
  // User asked for "see details", map is nice but maybe optional if strictly address-based.
  // Let's stick to a clean UI with no map for now to avoid broken map pins, focusing on the data.
  


    const handleUpdateStatus = async (newStatus: string) => {
        try {
            const { error } = await supabase
                .from('packages')
                .update({ status: newStatus })
                .eq('id', packageData.id);

            if (error) throw error;
            
            // Optimistic update
            setPackageData({ ...packageData, status: newStatus });
            alert(`Package marked as ${getStatusLabel(newStatus)}`);
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    };

    const isDeliverer = user && packageData.deliverer_id === user.id;

    return (
    <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Package #{packageData.id}</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* Tracking Map with Realtime/Simulated Data */}
            <View>
                <TrackingMap 
                    pickupAddress={packageData.pickup_address}
                    dropoffAddress={packageData.dropoff_address}
                    status={packageData.status}
                    currentLat={packageData.current_latitude}
                    currentLng={packageData.current_longitude}
                    pickupLat={packageData.pickup_latitude}
                    pickupLng={packageData.pickup_longitude}
                    dropoffLat={packageData.dropoff_latitude}
                    dropoffLng={packageData.dropoff_longitude}
                />
            </View>

            {/* Status Card */}
            <View style={styles.statusCard}>
                <View style={[styles.statusIcon, { backgroundColor: getStatusColor(packageData.status) + '20' }]}>
                    <Feather name="box" size={32} color={getStatusColor(packageData.status)} />
                </View>
                <View style={{ marginLeft: 16 }}>
                    <Text style={styles.statusLabel}>Current Status</Text>
                    <Text style={[styles.statusValue, { color: getStatusColor(packageData.status) }]}>
                        {getStatusLabel(packageData.status)}
                    </Text>
                    <Text style={styles.dateText}>
                        Updated: {new Date(packageData.updated_at || packageData.created_at).toLocaleString()}
                    </Text>
                </View>
            </View>

            {/* ACTION BUTTONS FOR DELIVERER */}
            {isDeliverer && packageData.status === 'assigned' && (
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                    onPress={() => handleUpdateStatus('in_transit')}
                >
                    <FontAwesome5 name="shipping-fast" size={18} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.actionButtonText}>Start Delivery</Text>
                </TouchableOpacity>
            )}

            {isDeliverer && packageData.status === 'in_transit' && (
                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => handleUpdateStatus('delivered')}
                >
                    <Feather name="check-circle" size={20} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.actionButtonText}>Complete Delivery</Text>
                </TouchableOpacity>
            )}


            {/* Route Section */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Route Information</Text>
                <View style={styles.routeContainer}>
                    {/* Pickup */}
                    <View style={styles.routeRow}>
                        <View style={styles.timelineCol}>
                            <View style={[styles.dot, { borderColor: '#7B1FA2' }]} />
                            <View style={styles.line} />
                        </View>
                        <View style={styles.routeInfo}>
                            <Text style={styles.routeLabel}>Pick Up</Text>
                            <Text style={styles.routeAddress}>{packageData.pickup_address}</Text>
                        </View>
                    </View>
                    {/* Dropoff */}
                    <View style={styles.routeRow}>
                        <View style={styles.timelineCol}>
                            <View style={[styles.dateSquare, { borderColor: '#C2185B' }]} />
                        </View>
                        <View style={styles.routeInfo}>
                            <Text style={styles.routeLabel}>Drop Off</Text>
                            <Text style={styles.routeAddress}>{packageData.dropoff_address}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Package Info */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Package Details</Text>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Type</Text>
                        <Text style={styles.gridValue}>{packageData.title}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Weight</Text>
                        <Text style={styles.gridValue}>{packageData.weight ? `${packageData.weight} kg` : 'N/A'}</Text>
                    </View>
                </View>

                {/* Price Row */}
                <View style={[styles.grid, { marginTop: 15 }]}>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Price</Text>
                        <Text style={styles.gridValue}>
                             {packageData.price ? `${packageData.price} DA` : 'Not Set'}
                        </Text>
                    </View>
                </View>
                <View style={[styles.grid, { marginTop: 15 }]}>
                    <View style={styles.gridItem}>
                         <Text style={styles.gridLabel}>Note</Text>
                         <Text style={styles.gridValue}>{packageData.description || 'No special instructions'}</Text>
                    </View>
                </View>
            </View>

            {/* Parties Info */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Contact Info</Text>
                <View style={styles.partyRow}>
                    <View style={styles.partyIcon}>
                        <Feather name="phone-call" size={20} color="#555" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>Recipient</Text>
                        <Text style={styles.routeAddress}>{packageData.description}</Text>
                    </View>
                </View>
                
                {packageData.deliverer && (
                    <View style={[styles.partyRow, { marginTop: 15 }]}>
                        <View style={styles.partyIcon}>
                            <FontAwesome5 name="shipping-fast" size={16} color="#555" />
                        </View>
                        <View>
                            <Text style={styles.routeLabel}>Deliverer</Text>
                            <Text style={styles.routeAddress}>{packageData.deliverer?.full_name}</Text>
                            <Text style={styles.subText}>{packageData.deliverer?.phone_number}</Text>
                        </View>
                    </View>
                )}
            </View>

        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: 25,
      paddingHorizontal: 24,
      backgroundColor: '#4A148C',
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: '#4A148C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 100,
  },
  backButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
  },
  scrollContent: {
      padding: 24,
      paddingTop: 10,
  },
  
  /* Status Card */
  statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      padding: 24,
      borderRadius: 24,
      marginBottom: 24,
      marginTop: -20, // Overlap header slightly
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
  },
  statusIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
  },
  statusLabel: {
      color: '#888',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  statusValue: {
      fontSize: 22,
      fontWeight: '800',
      marginTop: 4,
      marginBottom: 6,
  },
  dateText: {
      color: '#AAA',
      fontSize: 12,
      fontWeight: '500',
  },

  /* Sections */
  section: {
      backgroundColor: '#FFF',
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
  },
  sectionHeader: {
      fontSize: 17,
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
      paddingBottom: 15,
  },
  
  /* Route */
  routeContainer: {
      paddingLeft: 0,
  },
  routeRow: {
      flexDirection: 'row',
      marginBottom: 0,
  },
  timelineCol: {
      alignItems: 'center',
      width: 24,
      marginRight: 16,
  },
  dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 3,
      backgroundColor: '#FFF',
      zIndex: 1,
  },
  dateSquare: {
      width: 14,
      height: 14,
      borderRadius: 4,
      borderWidth: 3,
      backgroundColor: '#FFF',
      zIndex: 1,
  },
  line: {
      width: 2,
      flex: 1,
      backgroundColor: '#F0F0F0',
      marginVertical: -2,
      zIndex: 0,
  },
  routeInfo: {
      flex: 1,
      paddingBottom: 30,
  },
  routeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#999',
      marginBottom: 6,
      textTransform: 'uppercase',
  },
  routeAddress: {
      fontSize: 15,
      color: '#222',
      fontWeight: '600',
      lineHeight: 22,
  },
  
  /* Grid */
  grid: {
      flexDirection: 'row',
      gap: 15,
  },
  gridItem: {
      flex: 1,
      backgroundColor: '#F9F9F9',
      padding: 16,
      borderRadius: 16,
  },
  gridLabel: {
      color: '#888',
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 6,
      textTransform: 'uppercase',
  },
  gridValue: {
      color: '#333',
      fontSize: 15,
      fontWeight: '700',
  },

  /* Party */
  partyRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  partyIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  subText: {
      color: '#888',
      fontSize: 13,
      marginTop: 2,
  },
  
  actionButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 18,
      borderRadius: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
  },
  actionButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
  },
});
