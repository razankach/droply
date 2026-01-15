import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function DeliverPackage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailablePackages();
  }, []);

  const fetchAvailablePackages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch 'pending' packages
      // No location filtering - show all availble jobs
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not fetch available packages.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPackage = async (packageId: number) => {
    if (!user) return;
    setAcceptingId(packageId);
    try {
        const { error } = await supabase
            .from('packages')
            .update({ 
                status: 'assigned', 
                deliverer_id: user.id 
            })
            .eq('id', packageId);

        if (error) throw error;

        Alert.alert("Success", "You have accepted this delivery!", [
            { text: "Go to Dashboard", onPress: () => router.push('/dashboard') },
            { text: "Stay here", onPress: fetchAvailablePackages }
        ]);

    } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to accept package.");
    } finally {
        setAcceptingId(null);
    }
  };

  return (
    <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View>
                <Text style={styles.headerTitle}>Available Jobs</Text>
            </View>
            <TouchableOpacity onPress={fetchAvailablePackages} style={styles.refreshBtn}>
                <Feather name="refresh-cw" size={20} color="#FFF" />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.banner}>
                <FontAwesome5 name="shipping-fast" size={24} color="#4A148C" />
                <View style={{ marginLeft: 15, flex:1 }}>
                    <Text style={styles.bannerTitle}>Earn by Delivering</Text>
                    <Text style={styles.bannerText}>
                        Browse available packages and accept jobs to earn money.
                    </Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Recent Requests</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#4A148C" style={{ marginTop: 40 }} />
            ) : packages.length === 0 ? (
                 <View style={styles.emptyState}>
                     <Image 
                        source={{ uri: 'https://img.icons8.com/clouds/200/box.png' }} 
                        style={{ width: 120, height: 120, marginBottom: 20 }} 
                     />
                     <Text style={styles.emptyTitle}>No packages found</Text>
                     <Text style={styles.emptyText}>
                         There are currently no pending packages available.
                     </Text>
                 </View>
            ) : (
                packages.map((item, index) => (
                    <Animated.View 
                        key={item.id} 
                        entering={FadeInDown.delay(index * 100)}
                        style={styles.card}
                    >
                        {/* Header of Card */}
                        <View style={styles.cardHeader}>
                            <View style={styles.typeBadge}>
                                <Feather name="box" size={14} color="#7B1FA2" />
                                <Text style={styles.typeText}>{item.title}</Text>
                            </View>
                            <Text style={styles.priceTag}>
                                {item.price ? `${item.price} DA` : 'No Offer'}
                            </Text> 
                        </View>

                        {/* Route */}
                        <View style={styles.routeContainer}>
                            {/* From */}
                            <View style={styles.routeRow}>
                                <View style={[styles.dot, { borderColor: '#7B1FA2' }]} />
                                <Text style={styles.addressText} numberOfLines={1}>{item.pickup_address}</Text>
                            </View>
                            <View style={styles.line} />
                            {/* To */}
                            <View style={styles.routeRow}>
                                <View style={[styles.square, { borderColor: '#C2185B' }]} />
                                <Text style={styles.addressText} numberOfLines={1}>{item.dropoff_address}</Text>
                            </View>
                        </View>

                        {/* Details Row */}
                        <View style={styles.detailsRow}>
                             {item.weight && (
                                 <View style={styles.detailItem}>
                                     <FontAwesome5 name="weight-hanging" size={12} color="#888" />
                                     <Text style={styles.detailText}>{item.weight} kg</Text>
                                 </View>
                             )}
                             <View style={styles.detailItem}>
                                 <Feather name="clock" size={12} color="#888" />
                                 <Text style={styles.detailText}>{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                             </View>
                        </View>

                        {/* Accept Button */}
                        <TouchableOpacity 
                            style={styles.acceptButton}
                            onPress={() => handleAcceptPackage(item.id)}
                            disabled={acceptingId === item.id}
                        >
                            {acceptingId === item.id ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.acceptText}>Accept Delivery</Text>
                            )}
                        </TouchableOpacity>

                    </Animated.View>
                ))
            )}
            
            <View style={{ height: 40 }} />
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#F3E5F5', 
  },
  header: {
      height: 100,
      backgroundColor: '#4A148C',
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingBottom: 20,
      paddingHorizontal: 20,
      justifyContent: 'space-between',
  },
  backButton: {
      padding: 5,
  },
  headerTitle: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 3,
  },
  refreshBtn: {
      padding: 5,
  },
  scrollContent: {
      padding: 20,
  },
  
  /* Banner */
  banner: {
      flexDirection: 'row',
      backgroundColor: '#FFF',
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      marginBottom: 25,
      shadowColor: '#4A148C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
  },
  bannerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
  },
  bannerText: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
  },

  sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#4A148C',
      marginBottom: 15,
  },

  /* Empty State */
  emptyState: {
      alignItems: 'center',
      marginTop: 60,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#555',
  },
  emptyText: {
      fontSize: 14,
      color: '#AAA',
      marginTop: 5,
      textAlign: 'center',
      paddingHorizontal: 40,
  },

  /* Card */
  card: {
      backgroundColor: '#FFF',
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
  },
  typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3E5F5',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
  },
  typeText: {
      color: '#7B1FA2',
      fontWeight: '700',
      fontSize: 12,
      marginLeft: 6,
  },
  priceTag: {
      fontSize: 16,
      fontWeight: '800',
      color: '#2E7D32', // Green for money
  },

  /* Route */
  routeContainer: {
      marginBottom: 15,
  },
  routeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 24,
  },
  dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      marginRight: 10,
  },
  square: {
      width: 10,
      height: 10,
      borderRadius: 2,
      borderWidth: 2,
      marginRight: 10,
  },
  line: {
      width: 2,
      height: 16,
      backgroundColor: '#DDD',
      marginLeft: 4,
  },
  addressText: {
      color: '#333',
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
  },

  /* Details Row */
  detailsRow: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 15,
  },
  detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
  },
  detailText: {
      color: '#888',
      fontSize: 12,
  },

  /* Button */
  acceptButton: {
      backgroundColor: '#1A1A1A',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
  },
  acceptText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 14,
  },
});
