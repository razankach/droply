import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Dimensions, Platform, Modal, ScrollView, Pressable } from 'react-native';
import MapView, { Marker, Callout, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { router, Stack } from 'expo-router';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function DroplyMap() {
    const { user } = useAuth();
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [markers, setMarkers] = useState<any[]>([]);
    const [activeRoutes, setActiveRoutes] = useState<any[]>([]);
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [inTransitPackages, setInTransitPackages] = useState<any[]>([]);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        fetchUserLocation();
        fetchPackages();
    }, []);

    const fetchUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (error) {
            console.error('Error fetching user location:', error);
        }
    };

    // Animate to user location when it becomes available
    useEffect(() => {
        if (userLocation && mapRef.current && Platform.OS === 'ios') {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            }, 1000);
        }
    }, [userLocation]);

    const fetchPackages = async () => {
        try {
            console.log("Fetching packages for Droply Map..."); // DEBUG
            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .in('status', ['pending', 'assigned', 'in_transit', 'picked_up']);

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }
            if (data) {
                console.log(`Fetched ${data.length} packages.`); // DEBUG
                setPackages(data);
                processMapData(data);
            }
        } catch (e) {
            console.error("Fetch Error:", e);
            setLoading(false);
        }
    };

    const processMapData = async (pkgs: any[]) => {
        const newMarkers = [];
        const newRoutes = [];
        console.log("Processing map data..."); // DEBUG

        for (const pkg of pkgs) {
            try {

                let coords = null;
                let type = 'unknown';
                let color = '#757575';
                let iconName = 'box';

                // Determine Category & Styling
                if (user && pkg.deliverer_id === user.id && (pkg.status === 'in_transit' || pkg.status === 'assigned')) {
                    // MY ACTIVE DELIVERY
                    type = 'my_delivery';
                    color = '#2196F3'; // Blue
                    iconName = 'truck-fast'; 
                } else if (pkg.status === 'pending') {
                    // AVAILABLE JOB
                    type = 'available';
                    color = '#4CAF50'; // Green
                    iconName = 'box';
                } else if (user && pkg.sender_id === user.id) {
                    // MY OUTGOING PACKAGE
                    type = 'my_package';
                    color = '#9C27B0'; // Purple
                    iconName = 'gift';
                } else {
                    // OTHERS (Taken or In Transit by someone else)
                    type = 'other';
                    color = '#BDBDBD'; // Gray
                    iconName = 'cube-outline';
                }

                // Resolve Dropoff Coordinates (needed for Route & Flag)
                let dropoffCoords = null;
                if (pkg.dropoff_latitude && pkg.dropoff_longitude) {
                    dropoffCoords = { latitude: pkg.dropoff_latitude, longitude: pkg.dropoff_longitude };
                } else if (pkg.dropoff_address && type === 'my_delivery') {
                    // Fallback: Geocode if we need to show the route but have no stored coords
                    try {
                        const dRes = await Location.geocodeAsync(pkg.dropoff_address);
                        if (dRes.length > 0) dropoffCoords = { latitude: dRes[0].latitude, longitude: dRes[0].longitude };
                    } catch (e) { console.log("Dropoff geocode failed", e); }
                }

                // Resolve Coordinates
                // 1. Live Driver Location (Highest Priority for tracked packages)
                if (pkg.current_latitude && pkg.current_longitude) {
                    coords = { latitude: pkg.current_latitude, longitude: pkg.current_longitude };
                    // If it's MY delivery, also track the route to dropoff
                    if (type === 'my_delivery' && dropoffCoords) {
                         newRoutes.push({
                             id: pkg.id,
                             start: coords,
                             end: dropoffCoords,
                             color: color
                         });
                    }
                } 
                // 2. Stored Pickup
                else if (pkg.pickup_latitude && pkg.pickup_longitude) {
                    coords = { latitude: pkg.pickup_latitude, longitude: pkg.pickup_longitude };
                     // If assigned but not moving yet, show route from pickup to dropoff? Or just marker.
                     // Let's show route if I'm the deliverer regardless.
                     if (type === 'my_delivery' && dropoffCoords) {
                         newRoutes.push({
                             id: pkg.id,
                             start: coords,
                             end: dropoffCoords,
                             color: color
                         });
                    }
                }
                // 3. Geocoding Fallback
                else if (pkg.pickup_address) {
                    const results = await Location.geocodeAsync(pkg.pickup_address);
                    if (results.length > 0) {
                        coords = { latitude: results[0].latitude, longitude: results[0].longitude };
                    }
                }
                
                // 4. Ultimate Fallback (Default to Algiers Center)
                // This ensures old packages or bad addresses still show up somewhere.
                if (!coords) {
                     console.log(`Using fallback coordinates for pkg ${pkg.id}`);
                     coords = { latitude: 36.75, longitude: 3.06 }; // Algiers
                }

                if (coords) {
                    // Main Marker (Package/Driver)
                    console.log(`Adding marker for pkg ${pkg.id} (${type}) at`, coords); // DEBUG
                    newMarkers.push({
                        id: pkg.id,
                        coordinate: coords,
                        title: pkg.title,
                        description: pkg.status === 'assigned' ? 'Go to Pickup' : (pkg.status === 'in_transit' ? 'Go to Dropoff' : pkg.status),
                        status: pkg.status,
                        type,
                        color,
                        iconName,
                        pickup_address: pkg.pickup_address,
                        dropoff_address: pkg.dropoff_address
                    });

                    // SECONDARY MARKER: Destination for Active Deliveries
                    // If I am delivering this (assigned or in_transit), show the Dropoff point explicitly.
                    if (type === 'my_delivery' && dropoffCoords) {
                        newMarkers.push({
                            id: `dropoff-${pkg.id}`, // Unique ID for map key
                            coordinate: dropoffCoords,
                            title: "Destination",
                            description: pkg.dropoff_address,
                            status: 'destination', // Special status for styling
                            type: 'destination',
                            color: '#e91e63', // Pink/Red
                            iconName: 'flag-checkered',
                            pickup_address: pkg.pickup_address,
                            dropoff_address: pkg.dropoff_address
                        });
                    }
                } else {
                    console.log(`No coordinates found for pkg ${pkg.id}`); // DEBUG
                }

            } catch (error) {
                console.log("Error processing package map item", error);
            }
        }
        console.log(`Total Markers: ${newMarkers.length}`); // DEBUG
        setMarkers(newMarkers);
        setActiveRoutes(newRoutes);
        setLoading(false);
    };

    const openTrackingModal = () => {
        // Filter packages that are trackable (pending, assigned, in_transit)
        const transitPkgs = packages.filter(pkg => 
            pkg.status === 'pending' || pkg.status === 'assigned' || pkg.status === 'in_transit'
        );
        setInTransitPackages(transitPkgs);
        setShowTrackModal(true);
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


    // --- ANDROID: LEAFLET WEBVIEW ---
    if (Platform.OS === 'android') {
        const markerArray = JSON.stringify(markers.map(m => ({
            lat: m.coordinate.latitude,
            lng: m.coordinate.longitude,
            title: m.title,
            id: m.id,
            color: m.color,
            type: m.type
        })));

        const routeArray = JSON.stringify(activeRoutes.map(r => ({
            start: [r.start.latitude, r.start.longitude],
            end: [r.end.latitude, r.end.longitude],
            color: r.color
        })));

        const leafletHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style> body { margin: 0; } #map { height: 100vh; width: 100%; } </style>
          </head>
          <body>
            <div id="map"></div>
            <script>
              var map = L.map('map').setView([${userLocation?.latitude || 36.9}, ${userLocation?.longitude || 7.76}], 13);
              L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
              }).addTo(map);

              var markers = ${markerArray};
              var routes = ${routeArray};
              
              markers.forEach(function(m) {
                 // Simple colored markers using custom HTML or standard icon
                 // For simplicity, we'll iterate colors or use a colored dot icon
                 
                 var markerHtml = '<div style="background-color: '+m.color+'; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px black;"></div>';
                 
                 if (m.type === 'destination') {
                     // Flag icon for destination
                    markerHtml = '<div style="font-size: 24px;">🏁</div>';
                 }

                 var icon = L.divIcon({
                     className: 'custom-div-icon',
                     html: markerHtml,
                     iconSize: [24, 24],
                     iconAnchor: [12, 12]
                 });

                 var marker = L.marker([m.lat, m.lng], {icon: icon}).addTo(map);
                 marker.bindPopup('<b>'+m.title+'</b><br><button onclick="window.ReactNativeWebView.postMessage('+m.id+')">Details</button>');
              });

              routes.forEach(function(r) {
                  L.polyline([r.start, r.end], {color: r.color, dashArray: '5, 10'}).addTo(map);
              });
            </script>
          </body>
        </html>
        `;

        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <WebView
                    originWhitelist={['*']}
                    source={{ html: leafletHtml }}
                    style={{ flex: 1 }}
                    onMessage={(event) => {
                        const id = event.nativeEvent.data;
                        router.push(`/package-details/${id}`);
                    }}
                />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Droply Map</Text>
                    <TouchableOpacity onPress={fetchPackages} style={styles.refreshBtn}>
                        <Feather name="refresh-cw" size={20} color="#333" />
                    </TouchableOpacity>
                </View>
                <Legend />
                
                {/* Track Package FAB */}
                <TouchableOpacity 
                    style={styles.trackFab}
                    onPress={openTrackingModal}
                >
                    <MaterialCommunityIcons name="package-variant" size={24} color="#FFF" />
                    <Text style={styles.fabText}>Track</Text>
                </TouchableOpacity>

                {/* Track Package Modal */}
                <Modal
                    visible={showTrackModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowTrackModal(false)}
                >
                    <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowTrackModal(false)}
                    >
                        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Track Your Packages</Text>
                                <TouchableOpacity onPress={() => setShowTrackModal(false)}>
                                    <Feather name="x" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.packageList}>
                                {inTransitPackages.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={64} color="#CCC" />
                                        <Text style={styles.emptyText}>No packages to track</Text>
                                        <Text style={styles.emptySubtext}>Your sent packages will appear here</Text>
                                    </View>
                                ) : (
                                    inTransitPackages.map((pkg) => (
                                        <TouchableOpacity 
                                            key={pkg.id}
                                            style={styles.packageCard}
                                            onPress={() => {
                                                setShowTrackModal(false);
                                                router.push(`/package-details/${pkg.id}`);
                                            }}
                                        >
                                            <View style={styles.packageIcon}>
                                                <FontAwesome5 name="shipping-fast" size={20} color="#2196F3" />
                                            </View>
                                            <View style={styles.packageInfo}>
                                                <Text style={styles.packageTitle}>{pkg.title}</Text>
                                                <View style={styles.addressRow}>
                                                    <Feather name="map-pin" size={12} color="#7B1FA2" />
                                                    <Text style={styles.addressText} numberOfLines={1}>{pkg.pickup_address}</Text>
                                                </View>
                                                <View style={styles.addressRow}>
                                                    <Feather name="map" size={12} color="#C2185B" />
                                                    <Text style={styles.addressText} numberOfLines={1}>{pkg.dropoff_address}</Text>
                                                </View>
                                                <View style={[styles.statusBadge, { backgroundColor: getStatusInfo(pkg.status).bgColor }]}>
                                                    <View style={[styles.statusDot, { backgroundColor: getStatusInfo(pkg.status).color }]} />
                                                    <Text style={[styles.statusBadgeText, { color: getStatusInfo(pkg.status).color }]}>
                                                        {getStatusInfo(pkg.status).label}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Feather name="chevron-right" size={20} color="#999" />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </Modal>
            </View>
        );
    }

    // --- IOS: APPLE MAPS ---
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                    latitude: userLocation?.latitude || 36.9,
                    longitude: userLocation?.longitude || 7.76,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                showsUserLocation={true}
            >
                {markers.map((marker, index) => (
                    <Marker
                        key={`${marker.id}-${index}`}
                        coordinate={marker.coordinate}
                        title={marker.title}
                        description={marker.status}
                        onCalloutPress={() => router.push(`/package-details/${marker.id}`)}
                    >
                        <View style={[styles.markerView, { backgroundColor: marker.color, borderColor: marker.type === 'destination' ? '#000' : '#FFF' }]}>
                            {marker.type === 'destination' ? (
                                <FontAwesome5 name="flag-checkered" size={14} color="#FFF" />
                            ) : marker.type === 'driver' || marker.status === 'in_transit' ? (
                                <FontAwesome5 name="truck" size={14} color="#FFF" />
                            ) : (
                                <Feather name="box" size={16} color="#FFF" />
                            )}
                        </View>
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{marker.title}</Text>
                                <Text style={styles.calloutDesc}>{marker.description}</Text>
                                <Text style={styles.calloutLink}>Tap for details</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}

                {/* Render Paths for My Deliveries */}
                {activeRoutes.map((route, index) => (
                    <Polyline 
                        key={`route-${index}`}
                        coordinates={[route.start, route.end]}
                        strokeColor={route.color}
                        strokeWidth={3}
                        lineDashPattern={[5, 5]}
                    />
                ))}
            </MapView>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Droply Map</Text>
                <TouchableOpacity onPress={fetchPackages} style={styles.refreshBtn}>
                    <Feather name="refresh-cw" size={20} color="#333" />
                </TouchableOpacity>
            </View>

            <Legend />

            {/* Track Package FAB */}
            <TouchableOpacity 
                style={styles.trackFab}
                onPress={openTrackingModal}
            >
                <MaterialCommunityIcons name="package-variant" size={24} color="#FFF" />
                <Text style={styles.fabText}>Track</Text>
            </TouchableOpacity>

            {/* Track Package Modal */}
            <Modal
                visible={showTrackModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTrackModal(false)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setShowTrackModal(false)}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Track Your Packages</Text>
                            <TouchableOpacity onPress={() => setShowTrackModal(false)}>
                                <Feather name="x" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.packageList}>
                            {inTransitPackages.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="package-variant-closed" size={64} color="#CCC" />
                                    <Text style={styles.emptyText}>No packages in transit</Text>
                                    <Text style={styles.emptySubtext}>Your active deliveries will appear here</Text>
                                </View>
                            ) : (
                                inTransitPackages.map((pkg) => (
                                    <TouchableOpacity 
                                        key={pkg.id}
                                        style={styles.packageCard}
                                        onPress={() => {
                                            setShowTrackModal(false);
                                            router.push(`/package-details/${pkg.id}`);
                                        }}
                                    >
                                        <View style={styles.packageIcon}>
                                            <FontAwesome5 name="shipping-fast" size={20} color="#2196F3" />
                                        </View>
                                        <View style={styles.packageInfo}>
                                            <Text style={styles.packageTitle}>{pkg.title}</Text>
                                            <View style={styles.addressRow}>
                                                <Feather name="map-pin" size={12} color="#7B1FA2" />
                                                <Text style={styles.addressText} numberOfLines={1}>{pkg.pickup_address}</Text>
                                            </View>
                                            <View style={styles.addressRow}>
                                                <Feather name="map" size={12} color="#C2185B" />
                                                <Text style={styles.addressText} numberOfLines={1}>{pkg.dropoff_address}</Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: getStatusInfo(pkg.status).bgColor }]}>
                                                <View style={[styles.statusDot, { backgroundColor: getStatusInfo(pkg.status).color }]} />
                                                <Text style={[styles.statusBadgeText, { color: getStatusInfo(pkg.status).color }]}>
                                                    {getStatusInfo(pkg.status).label}
                                                </Text>
                                            </View>
                                        </View>
                                        <Feather name="chevron-right" size={20} color="#999" />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {loading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#4A148C" />
                    <Text style={{ marginTop: 10, color: '#4A148C', fontWeight: '600' }}>Locating...</Text>
                </View>
            )}
        </View>
    );
}

function Legend() {
    return (
        <View style={styles.legend}>
            <View style={styles.legendItem}>
               <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
               <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
               <View style={[styles.dot, { backgroundColor: '#2196F3' }]} />
               <Text style={styles.legendText}>My Delivery</Text>
            </View>
            <View style={styles.legendItem}>
               <View style={[styles.dot, { backgroundColor: '#9C27B0' }]} />
               <Text style={styles.legendText}>My Package</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: width,
        height: height,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 5,
    },
    backBtn: { padding: 5 },
    refreshBtn: { padding: 5 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    
    markerView: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4
    },
    callout: { width: 150, padding: 5, alignItems: 'center' },
    calloutTitle: { fontWeight: 'bold', marginBottom: 2 },
    calloutDesc: { fontSize: 12, color: '#666' },
    calloutLink: { fontSize: 12, color: '#2196F3', marginTop: 4 },
    
    loaderContainer: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 20,
        borderRadius: 20,
        elevation: 5,
        alignItems: 'center',
    },

    legend: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        padding: 10,
        elevation: 3,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    legendText: { fontSize: 10, fontWeight: '600', color: '#555' },

    // Track Package FAB
    trackFab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        backgroundColor: '#4A148C',
        borderRadius: 30,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        gap: 8,
    },
    fabText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.7,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    packageList: {
        padding: 16,
    },
    packageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    packageIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    packageInfo: {
        flex: 1,
        gap: 4,
    },
    packageTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addressText: {
        fontSize: 12,
        color: '#666',
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#BBB',
        marginTop: 8,
    },

    // Status Badge
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
