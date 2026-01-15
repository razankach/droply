import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const { user } = useAuth();
  const { view } = useLocalSearchParams();
  const [viewMode, setViewMode] = useState<'sent' | 'deliveries'>((view as 'sent' | 'deliveries') || 'sent');
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    if (view && (view === 'sent' || view === 'deliveries')) {
        setViewMode(view as 'sent' | 'deliveries');
    }
  }, [view]);

  useEffect(() => {
    fetchPackages();
  }, [viewMode]);

  const fetchPackages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('packages').select('*').order('created_at', { ascending: false });

      if (viewMode === 'sent') {
          query = query.eq('sender_id', user.id);
      } else {
          query = query.eq('deliverer_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPackages(data || []);
      
      // Update stats based on fetched data (simplified)
      setStats(prev => ({
          ...prev,
          total: data?.length || 0,
          active: data?.filter(p => p.status === 'pending' || p.status === 'in_transit' || p.status === 'assigned').length || 0
      }));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverPackage = async (packageId: number) => {
      try {
          const { error } = await supabase
              .from('packages')
              .update({ status: 'delivered' })
              .eq('id', packageId);
          
          if (error) throw error;
          fetchPackages();
      } catch (e) {
          console.error(e);
          alert("Failed to update status.");
      }
  };

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'pending': return '#FFA000'; // Amber
          case 'assigned': return '#7B1FA2'; // Purple
          case 'in_transit': return '#2196F3'; // Blue
          case 'delivered': return '#4CAF50'; // Green
          case 'cancelled': return '#F44336'; // Red
          default: return '#757575';
      }
  };

  const getStatusLabel = (status: string) => {
      return status.replace('_', ' ').toUpperCase();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Image 
          source={{ uri: 'https://img.icons8.com/color/96/box-other.png' }} 
          style={styles.logo} 
        />
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Circles */}
      <View style={styles.statsContainer}>
          {/* Main big circle */}
          <View style={[styles.circle, styles.circleBig]}>
               <Text style={styles.circleNumber}>{stats.total}</Text>
               <Text style={styles.circleLabel}>Total</Text>
          </View>
          {/* Medium circle */}
          <View style={[styles.circle, styles.circleMedium]}>
               <Text style={styles.circleNumber}>{stats.active}</Text>
               <Text style={styles.circleLabel}>Active</Text>
          </View>
      </View>

      {/* ToggleSwitch */}
      <View style={styles.toggleContainer}>
           <TouchableOpacity 
              style={[styles.pillOption, viewMode === 'sent' && styles.pillSelected]} 
              onPress={() => setViewMode('sent')}
           >
              <Text style={[styles.pillText, viewMode === 'sent' && styles.textSelected]}>Sent</Text>
           </TouchableOpacity>

           <TouchableOpacity 
              style={[styles.pillOption, viewMode === 'deliveries' && styles.pillSelected]} 
              onPress={() => setViewMode('deliveries')}
           >
              <Text style={[styles.pillText, viewMode === 'deliveries' && styles.textSelected]}>My Deliveries</Text>
           </TouchableOpacity>
      </View>

      {/* List Header */}
      <View style={styles.listHeader}>
         <Text style={styles.sectionTitle}>
             {viewMode === 'sent' ? 'Sent History' : 'My Deliveries'}
         </Text>
         <TouchableOpacity onPress={fetchPackages}>
             <Feather name="refresh-ccw" size={16} color="#4A148C" />
         </TouchableOpacity>
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        {loading ? (
            <ActivityIndicator size="large" color="#4A148C" style={{ marginTop: 20 }} />
        ) : packages.length === 0 ? (
            <View style={styles.emptyState}>
                <Feather name="package" size={40} color="#DDD" />
                <Text style={styles.emptyText}>No packages found.</Text>
            </View>
        ) : (
            packages.map((item, index) => (
                <View key={item.id}>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        onPress={() => router.push(`/package-details/${item.id}`)} // Assumes this route exists, keeping logical flow
                    >
                    <Animated.View 
                        entering={FadeInDown.delay(index * 100)}
                        style={styles.card}
                    >
                        <View style={styles.cardLeft}>
                            <View style={[styles.iconBox, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                 <Feather name="box" size={20} color={getStatusColor(item.status)} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <Text style={styles.cardSubtitle} numberOfLines={1}>
                                    To: {item.dropoff_address ? item.dropoff_address.split(',')[0] : 'Unknown'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15', marginRight: 8 }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                            {getStatusLabel(item.status)}
                                        </Text>
                                    </View>
                                    {item.price && (
                                        <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>
                                            {item.price} DA
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                        
                        <View style={styles.cardRight}>
                             {/* Action Buttons based on ViewMode and Status */}
                             {viewMode === 'deliveries' && item.status !== 'delivered' && (
                                 <TouchableOpacity 
                                    style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} 
                                    onPress={() => handleDeliverPackage(item.id)}
                                 >
                                     <Text style={styles.actionBtnText}>Done</Text>
                                 </TouchableOpacity>
                             )}

                             {/* Fallback Date if no action needed */}
                             {!(viewMode === 'deliveries' && item.status !== 'delivered') &&
                              (
                                <Text style={styles.timeText}>
                                    {new Date(item.created_at).toLocaleDateString()}
                                </Text>
                             )}
                        </View>
                    </Animated.View>
                    </TouchableOpacity>
                </View>
            ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 15,
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
  logo: {
      width: 40,
      height: 40,
  },
  
  /* Stats Circles */
  statsContainer: {
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      marginBottom: 0,
  },
  circle: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 150,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 10,
  },
  circleBig: {
      width: 140,
      height: 140,
      backgroundColor: '#4A148C', // Deep Purple
      zIndex: 1,
      top: 20,
      left: '50%',
      transform: [{ translateX: -70 }],
      borderWidth: 4,
      borderColor: '#FFF',
  },
  circleMedium: {
      width: 100,
      height: 100,
      backgroundColor: '#7B1FA2', // Purple
      zIndex: 2,
      top: 90,
      left: '50%',
      transform: [{ translateX: 20 }], // shift right
      borderWidth: 3,
      borderColor: '#FFF',
  },
  circleSmall: {
      width: 70,
      height: 70,
      backgroundColor: '#C2185B', // Pink
      zIndex: 3,
      top: 130,
      left: '50%',
      transform: [{ translateX: -80 }], // shift left
      borderWidth: 2,
      borderColor: '#FFF',
  },
  circleNumber: {
      color: '#FFF',
      fontSize: 28,
      fontWeight: 'bold',
  },
  circleLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
  },

  /* Toggle */
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDE7F6',
    marginHorizontal: 24,
    borderRadius: 50,
    padding: 4,
    marginBottom: 20,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 40,
  },
  pillSelected: {
      backgroundColor: '#4A148C',
      shadowColor: "#4A148C",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 3,
  },
  pillText: {
      fontWeight: '600',
      color: '#7B1FA2',
  },
  textSelected: {
      color: '#FFF',
  },

  /* List */
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#333',
  },
  listContainer: {
      paddingHorizontal: 24,
  },
  card: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
  },
  cardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  cardContent: {
      flex: 1,
  },
  cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1A1A1A',
      marginBottom: 2,
  },
  cardSubtitle: {
      fontSize: 12,
      color: '#777',
      marginBottom: 6,
  },
  statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  statusText: {
      fontSize: 10,
      fontWeight: '700',
  },
  cardRight: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 40,
  },
  timeText: {
      fontSize: 10,
      color: '#AAA',
      marginBottom: 8,
  },
  emptyState: {
      alignItems: 'center',
      marginTop: 40,
  },
  emptyText: {
      color: '#999',
      marginTop: 10,
      fontSize: 14,
  },
  actionBtn: {
      backgroundColor: '#7B1FA2',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      elevation: 2,
  },
  actionBtnText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 12,
  },
});
