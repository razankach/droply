import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function TrackPackage() {
    const { user } = useAuth();
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInTransitPackages();
    }, []);

    const fetchInTransitPackages = async () => {
        try {
            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .in('status', ['pending', 'assigned', 'in_transit'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPackages(data || []);
        } catch (e) {
            console.error('Error fetching packages:', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'Pending Pickup', color: '#FF9800', bgColor: '#FFF3E0' };
            case 'assigned':
                return { label: 'Assigned to Driver', color: '#2196F3', bgColor: '#E3F2FD' };
            case 'in_transit':
                return { label: 'In Transit', color: '#4CAF50', bgColor: '#E8F5E9' };
            default:
                return { label: status, color: '#999', bgColor: '#F5F5F5' };
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Track Your Packages</Text>
                <TouchableOpacity onPress={fetchInTransitPackages} style={styles.refreshButton}>
                    <Feather name="refresh-cw" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A148C" />
                    <Text style={styles.loadingText}>Loading packages...</Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {packages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="package-variant-closed" size={80} color="#CCC" />
                            <Text style={styles.emptyTitle}>No packages to track</Text>
                            <Text style={styles.emptySubtext}>
                                Your sent packages will appear here
                            </Text>
                            <TouchableOpacity 
                                style={styles.sendButton}
                                onPress={() => router.push('/send-package')}
                            >
                                <Text style={styles.sendButtonText}>Send a Package</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.countText}>
                                {packages.length} {packages.length === 1 ? 'package' : 'packages'} to track
                            </Text>
                            {packages.map((pkg) => (
                                <TouchableOpacity 
                                    key={pkg.id}
                                    style={styles.packageCard}
                                    onPress={() => router.push(`/package-details/${pkg.id}`)}
                                >
                                    <View style={styles.packageIcon}>
                                        <FontAwesome5 name="shipping-fast" size={24} color="#2196F3" />
                                    </View>
                                    <View style={styles.packageInfo}>
                                        <Text style={styles.packageTitle}>{pkg.title}</Text>
                                        <View style={styles.addressRow}>
                                            <Feather name="map-pin" size={14} color="#7B1FA2" />
                                            <Text style={styles.addressLabel}>From: </Text>
                                            <Text style={styles.addressText} numberOfLines={1}>
                                                {pkg.pickup_address}
                                            </Text>
                                        </View>
                                        <View style={styles.addressRow}>
                                            <Feather name="map" size={14} color="#C2185B" />
                                            <Text style={styles.addressLabel}>To: </Text>
                                            <Text style={styles.addressText} numberOfLines={1}>
                                                {pkg.dropoff_address}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusInfo(pkg.status).bgColor }]}>
                                            <View style={[styles.statusDot, { backgroundColor: getStatusInfo(pkg.status).color }]} />
                                            <Text style={[styles.statusText, { color: getStatusInfo(pkg.status).color }]}>
                                                {getStatusInfo(pkg.status).label}
                                            </Text>
                                        </View>
                                    </View>
                                    <Feather name="chevron-right" size={24} color="#999" />
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </ScrollView>
            )}
        </View>
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
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 24,
        backgroundColor: '#4A148C',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#4A148C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    refreshButton: {
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    packageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    packageIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    packageInfo: {
        flex: 1,
        gap: 6,
    },
    packageTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addressLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    addressText: {
        fontSize: 13,
        color: '#888',
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2196F3',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2196F3',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#999',
        marginTop: 24,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        color: '#BBB',
        textAlign: 'center',
        marginBottom: 32,
    },
    sendButton: {
        backgroundColor: '#4A148C',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 20,
        shadowColor: '#4A148C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
