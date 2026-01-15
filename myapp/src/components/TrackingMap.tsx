import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { FontAwesome5 } from '@expo/vector-icons';

interface TrackingMapProps {
    pickupAddress: string;
    dropoffAddress: string;
    status: string;
    currentLat?: number;
    currentLng?: number;
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
}

export default function TrackingMap({ 
    pickupAddress, dropoffAddress, status, currentLat, currentLng,
    pickupLat, pickupLng, dropoffLat, dropoffLng 
}: TrackingMapProps) {
    const mapRef = useRef<MapView>(null);
    const [pickupCoords, setPickupCoords] = useState<any>(null);
    const [dropoffCoords, setDropoffCoords] = useState<any>(null);
    const [driverCoords, setDriverCoords] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Initial geocoding or using provided coords
    useEffect(() => {
        const resolveCoordinates = async () => {
             // Default to Algiers
             let pCoords = { latitude: 36.75, longitude: 3.06 }; 
             let dCoords = { latitude: 36.70, longitude: 3.05 };

             try {
                 // PICKUP
                 if (pickupLat && pickupLng) {
                     pCoords = { latitude: pickupLat, longitude: pickupLng };
                 } else if (pickupAddress) {
                    const pRes = await Location.geocodeAsync(pickupAddress);
                    if (pRes.length > 0) pCoords = pRes[0];
                 }

                 // DROPOFF
                 if (dropoffLat && dropoffLng) {
                     dCoords = { latitude: dropoffLat, longitude: dropoffLng };
                 } else if (dropoffAddress) {
                    const dRes = await Location.geocodeAsync(dropoffAddress);
                    if (dRes.length > 0) dCoords = dRes[0];
                 }

                 setPickupCoords(pCoords);
                 setDropoffCoords(dCoords);
             } catch (e) {
                 console.log("Coordinate resolution error (using defaults)", e);
                 setPickupCoords(pCoords);
                 setDropoffCoords(dCoords);
             } finally {
                 setLoading(false);
             }
        };
        resolveCoordinates();
    }, [pickupAddress, dropoffAddress, pickupLat, pickupLng, dropoffLat, dropoffLng]);

    // Update driver position
    useEffect(() => {
        if (currentLat && currentLng) {
            setDriverCoords({ latitude: currentLat, longitude: currentLng });
        } else if (status === 'in_transit' && pickupCoords && dropoffCoords && !currentLat) {
            // Simulation logic
            const midLat = (pickupCoords.latitude + dropoffCoords.latitude) / 2;
            const midLng = (pickupCoords.longitude + dropoffCoords.longitude) / 2;
            setDriverCoords({ latitude: midLat, longitude: midLng });
        } else if (status === 'picked_up' && pickupCoords) {
             setDriverCoords(pickupCoords);
        }
    }, [status, currentLat, currentLng, pickupCoords, dropoffCoords]);

    // iOS MapView Fit
    useEffect(() => {
        if (Platform.OS === 'ios' && !loading && mapRef.current && pickupCoords && dropoffCoords) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates([
                    { latitude: pickupCoords.latitude, longitude: pickupCoords.longitude },
                    { latitude: dropoffCoords.latitude, longitude: dropoffCoords.longitude },
                    ...(driverCoords ? [{ latitude: driverCoords.latitude, longitude: driverCoords.longitude }] : [])
                ], {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }, 500);
        }
    }, [loading, pickupCoords, dropoffCoords, driverCoords]);


    if (loading) {
        return <View style={styles.loader}><ActivityIndicator color="#4A148C" /></View>;
    }

    // --- ANDROID: LEAFLET WEBVIEW ---
    if (Platform.OS === 'android') {
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
              var map = L.map('map').setView([${pickupCoords.latitude}, ${pickupCoords.longitude}], 13);
              L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
              }).addTo(map);

              var pickupIcon = L.icon({
                  iconUrl: 'https://img.icons8.com/color/48/box-other.png',
                  iconSize: [32, 32],
                  iconAnchor: [16, 32]
              });
              var dropoffIcon = L.icon({
                  iconUrl: 'https://img.icons8.com/color/48/finish-flag.png',
                  iconSize: [32, 32],
                  iconAnchor: [16, 32]
              });
              var driverIcon = L.icon({
                  iconUrl: 'https://img.icons8.com/color/48/truck.png',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
              });

              L.marker([${pickupCoords.latitude}, ${pickupCoords.longitude}], {icon: pickupIcon})
               .bindPopup("Pickup").addTo(map);

              L.marker([${dropoffCoords.latitude}, ${dropoffCoords.longitude}], {icon: dropoffIcon})
               .bindPopup("Dropoff").addTo(map);

              ${driverCoords ? `
              L.marker([${driverCoords.latitude}, ${driverCoords.longitude}], {icon: driverIcon})
               .bindPopup("Deliverer").addTo(map);
              ` : ''}

              var latlngs = [
                  [${pickupCoords.latitude}, ${pickupCoords.longitude}],
                  ${driverCoords ? `[${driverCoords.latitude}, ${driverCoords.longitude}],` : ''}
                  [${dropoffCoords.latitude}, ${dropoffCoords.longitude}]
              ];
              var polyline = L.polyline(latlngs, {color: '#4A148C', dashArray: '10, 10'}).addTo(map);
              map.fitBounds(polyline.getBounds(), {padding: [50, 50]});
            </script>
          </body>
        </html>
        `;

        return (
            <View style={styles.container}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html: leafletHtml }}
                    style={{ flex: 1 }}
                />
            </View>
        );
    }

    // --- IOS: APPLE MAPS ---
    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT} // Apple Maps
                initialRegion={{
                    latitude: pickupCoords.latitude,
                    longitude: pickupCoords.longitude,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
            >
                {/* Pickup Marker */}
                {pickupCoords && (
                    <Marker coordinate={pickupCoords} title="Pickup" description={pickupAddress}>
                        <View style={[styles.markerBase, { backgroundColor: '#7B1FA2' }]}>
                            <FontAwesome5 name="box-open" size={14} color="#FFF" />
                        </View>
                    </Marker>
                )}

                {/* Dropoff Marker */}
                {dropoffCoords && (
                    <Marker coordinate={dropoffCoords} title="Dropoff" description={dropoffAddress}>
                        <View style={[styles.markerBase, { backgroundColor: '#C2185B' }]}>
                            <FontAwesome5 name="flag-checkered" size={14} color="#FFF" />
                        </View>
                    </Marker>
                )}
                
                {/* Driver Marker */}
                {driverCoords && (status === 'in_transit' || status === 'picked_up') && (
                    <Marker coordinate={driverCoords} title="Deliverer">
                        <View style={styles.driverMarker}>
                            <FontAwesome5 name="shipping-fast" size={16} color="#FFF" />
                        </View>
                    </Marker>
                )}

                {/* Route Line */}
                {pickupCoords && dropoffCoords && (
                    <Polyline 
                        coordinates={[
                            pickupCoords,
                            ...(driverCoords ? [driverCoords] : []),
                            dropoffCoords
                        ]}
                        strokeColor="#4A148C"
                        strokeWidth={3}
                        lineDashPattern={[5, 5]}
                    />
                )}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 250,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    loader: {
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#EEE',
        borderRadius: 16,
        marginBottom: 20,
    },
    markerBase: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    driverMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        elevation: 4,
    }
});
