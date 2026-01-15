import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
const SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.15; 
const SHEET_PEEK_TRANSLATE_Y = SCREEN_HEIGHT * 0.70; 

export default function SendPackage() {
  const { user } = useAuth();
  const [locationMethod, setLocationMethod] = useState<'map' | 'current'>('current'); 
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Coordinate State (Precise)
  const [pickupLocation, setPickupLocation] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Form State
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [packageType, setPackageType] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Which field are we picking for?
  const [activeField, setActiveField] = useState<'from' | 'to'>('to');

  const webViewRef = useRef<WebView>(null);
  const slideAnim = useRef(new Animated.Value(SHEET_PEEK_TRANSLATE_Y)).current;
  const [isExpanded, setIsExpanded] = useState(false);

  // Initial Location Fetch
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      
      // If default is 'current', fill From immediately
      if (locationMethod === 'current') {
         reverseGeocode(location.coords.latitude, location.coords.longitude, setFromAddress);
      }
    })();
  }, []);

  // When toggling methods
  const handleMethodChange = async (method: 'map' | 'current') => {
      setLocationMethod(method);
      if (method === 'current') {
          if (currentLocation) {
              reverseGeocode(currentLocation.coords.latitude, currentLocation.coords.longitude, setFromAddress);
          } else {
              let location = await Location.getCurrentPositionAsync({});
              setCurrentLocation(location);
              reverseGeocode(location.coords.latitude, location.coords.longitude, setFromAddress);
          }
      } else {
          setFromAddress(''); 
      }
  };

  const reverseGeocode = async (lat: number, lng: number, setter: (addr: string) => void) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar,en`, {
        headers: { 'User-Agent': 'DroplyApp/1.0' }
      });
      const text = await response.text();
      if (!response.ok) return;
      try {
        const data = JSON.parse(text);
        if (data.display_name) setter(data.display_name);
      } catch (e) {}
    } catch (error) {}
  };

  const openMapFor = (field: 'from' | 'to') => {
      if (locationMethod === 'current' && field === 'from') {
          Alert.alert("Location Locked", "Switch to 'Pin on Map' to select a different starting location.");
          return;
      }

      setActiveField(field);
      setIsExpanded(true);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
  };

  const collapseMap = () => {
    setIsExpanded(false);
    Animated.spring(slideAnim, { toValue: SHEET_PEEK_TRANSLATE_Y, useNativeDriver: true }).start();
  };

  const confirmLocation = () => {
      if (selectedLocation) {
          if (activeField === 'from') {
               reverseGeocode(selectedLocation.lat, selectedLocation.lng, setFromAddress);
               setPickupLocation(selectedLocation);
          } else {
               reverseGeocode(selectedLocation.lat, selectedLocation.lng, setToAddress);
               setDropoffLocation(selectedLocation);
          }
          collapseMap();
          setSelectedLocation(null); 
      }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) openMapFor(activeField); 
        else if (gestureState.dy > 50) collapseMap();
      },
    })
  ).current;

  // Supabase Handler
  const handleSendPackage = async () => {
    if (!user) {
        Alert.alert("Error", "You must be logged in to send a package.");
        return;
    }
    if (!fromAddress || !toAddress || !packageType || !recipientPhone) {
        Alert.alert("Missing Fields", "Please fill in all required fields (Locations, Type, Phone).");
        return;
    }

    setIsSubmitting(true);
    try {
        const { error } = await supabase
            .from('packages')
            .insert({
                sender_id: user.id,
                title: packageType,
                description: `Phone: ${recipientPhone} - ${instructions}`, 
                pickup_address: fromAddress,
                dropoff_address: toAddress,
                weight: weight ? parseFloat(weight) : null,
                price: price ? parseFloat(price) : null,
                status: 'pending',
                // Save coordinates!
                pickup_latitude: locationMethod === 'current' ? currentLocation?.coords.latitude : pickupLocation?.lat,
                pickup_longitude: locationMethod === 'current' ? currentLocation?.coords.longitude : pickupLocation?.lng,
                dropoff_latitude: dropoffLocation?.lat,
                dropoff_longitude: dropoffLocation?.lng
            });


        if (error) throw error;

        Alert.alert("Success", "Your package request has been sent!", [
            { text: "OK", onPress: () => router.push('/dashboard') }
        ]);
        
    } catch (error: any) {
        Alert.alert("Submission Error", error.message || "Could not send package.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Map HTML Generation
  const lat = currentLocation?.coords.latitude || 36.75;
  const lng = currentLocation?.coords.longitude || 3.05;
  const hasLocation = !!currentLocation;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style> body { margin: 0; padding: 0; } #map { height: 100vh; width: 100%; } </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${lat}, ${lng}], 13);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
          }).addTo(map);
          var marker;
          if (${hasLocation}) {
            L.marker([${lat}, ${lng}]).addTo(map).bindPopup('You').openPopup();
          }
          map.on('click', function(e) {
            if (marker) map.removeLayer(marker);
            marker = L.marker(e.latlng).addTo(map);
            window.ReactNativeWebView.postMessage(JSON.stringify(e.latlng));
          });
        </script>
      </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelectedLocation(data);
    } catch (e) {}
  };

  return (
    <View style={styles.mainContainer}>
      
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Package</Text>
          <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
        <Text style={styles.pageSubtitle}>Where are we sending this?</Text>

        {/* --- Location Section --- */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Route Details</Text>
        </View>

        <View style={styles.routeContainer}>
            <View style={styles.timeline}>
                <View style={[styles.dot, { borderColor: '#7B1FA2' }]} />
                <View style={styles.line} />
                <View style={[styles.square, { borderColor: '#C2185B' }]} />
            </View>

            <View style={styles.inputsColumn}>
                
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Pick up from</Text>
                    <TouchableOpacity 
                        style={[styles.inputWrapper, locationMethod === 'current' && styles.disabledInput]}
                        onPress={() => openMapFor('from')}
                        activeOpacity={locationMethod === 'current' ? 1 : 0.7}
                    >
                        <Feather name="map-pin" size={18} color="#7B1FA2" style={styles.inputIcon} />
                        <Text style={[styles.inputTextValue, !fromAddress && styles.placeholder]}>
                            {fromAddress || (locationMethod === 'current' ? "Fetching current location..." : "Select Pickup Location")}
                        </Text>
                        {locationMethod === 'current' && <Feather name="lock" size={14} color="#999" />}
                    </TouchableOpacity>
                </View>

                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Deliver to</Text>
                    <TouchableOpacity style={styles.inputWrapper} onPress={() => openMapFor('to')}>
                        <Feather name="map" size={18} color="#C2185B" style={styles.inputIcon} />
                        <Text style={[styles.inputTextValue, !toAddress && styles.placeholder]}>
                            {toAddress || "Select Destination on Map"}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>

        <View style={styles.toggleContainer}>
             <TouchableOpacity 
                style={[styles.pillOption, locationMethod === 'map' && styles.pillSelectedMap]} 
                onPress={() => handleMethodChange('map')}
             >
                <Text style={[styles.pillText, locationMethod === 'map' && styles.textSelected]}>Pin on Map</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[styles.pillOption, locationMethod === 'current' && styles.pillSelectedLoc]} 
                onPress={() => handleMethodChange('current')}
             >
                <Text style={[styles.pillText, locationMethod === 'current' && styles.textSelected]}>Use My Location</Text>
             </TouchableOpacity>
        </View>


            {/* --- Package Details --- */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>What are you sending?</Text>
            </View>

            {/* Type Selector */}
            <View style={styles.typeSelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
                    {['Documents', 'Small Box', 'Large Box', 'Fragile', 'Groceries'].map((type) => (
                        <TouchableOpacity 
                            key={type}
                            style={[
                                styles.typeChip, 
                                packageType === type && styles.typeChipSelected
                            ]}
                            onPress={() => setPackageType(type)}
                        >
                            <Text style={[
                                styles.typeChipText, 
                                packageType === type && styles.typeChipTextSelected
                            ]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            
            <View style={styles.detailsGrid}>
                {/* Weight */}
                <View style={styles.gridItem}>
                    <View style={styles.floatingInput}>
                        <FontAwesome5 name="weight-hanging" size={18} color="#7B1FA2" />
                        <TextInput 
                            style={styles.bareInput} 
                            placeholder="Weight (kg)" 
                            placeholderTextColor="#AAA" 
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />
                    </View>
                </View>

                {/* Price */}
                <View style={styles.gridItem}>
                    <View style={styles.floatingInput}>
                        <Feather name="dollar-sign" size={20} color="#388E3C" />
                        <TextInput 
                            style={styles.bareInput} 
                            placeholder="Price (DA)" 
                            placeholderTextColor="#AAA" 
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                        />
                    </View>
                </View>
            </View>

            <View style={[styles.floatingInput, { marginTop: 16 }]}>
                <Feather name="phone" size={20} color="#555" />
                <TextInput 
                    style={styles.bareInput} 
                    placeholder="Recipient Phone" 
                    placeholderTextColor="#AAA"
                    keyboardType="phone-pad"
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                />
            </View>

            <View style={[styles.floatingInput, { marginTop: 16 }]}>
                <MaterialIcons name="notes" size={22} color="#555" />
                <TextInput 
                    style={styles.bareInput} 
                    placeholder="Special instructions (e.g., Gate code)..." 
                    placeholderTextColor="#AAA"
                    value={instructions}
                    onChangeText={setInstructions} 
                />
            </View>

        {/* Submit Button */}
        <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]} 
            onPress={handleSendPackage}
            disabled={isSubmitting}
        >
            <Text style={styles.submitText}>
                {isSubmitting ? "Sending..." : "Send Request"}
            </Text>
            {!isSubmitting && <Feather name="send" size={20} color="#FFF" style={{ marginLeft: 10 }} />}
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ height: 300 }} />

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Map Bottom Sheet */}
      <Animated.View 
        style={[
          styles.bottomSheet, 
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.sheetHandleContainer}>
          <View style={styles.sheetHandle} />
        </View>
        
        <View style={styles.mapContainer}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={{ flex: 1 }}
                onMessage={handleWebViewMessage}
            />
            {isExpanded && (
                <View style={styles.mapOverlay}>
                     {selectedLocation ? (
                         <View style={styles.confirmBanner}>
                             <View style={styles.bannerIcon}>
                                <Feather name="check" size={24} color="#FFF" />
                             </View>
                             <View style={{ flex: 1, marginHorizontal: 12 }}>
                                 <Text style={styles.bannerLabel}>
                                     {activeField === 'from' ? "Confirm Pickup" : "Confirm Destination"}
                                 </Text>
                                 <Text numberOfLines={1} style={styles.bannerAddress}>
                                    {`Lat: ${selectedLocation.lat.toFixed(4)}, Lng: ${selectedLocation.lng.toFixed(4)}`}
                                 </Text>
                             </View>
                             <TouchableOpacity style={styles.minimalConfirmBtn} onPress={confirmLocation}>
                                 <Text style={styles.minimalConfirmText}>OK</Text>
                             </TouchableOpacity>
                         </View>
                     ) : (
                         <View style={styles.instructionBanner}>
                             <Text style={styles.instructionText}>
                                 {activeField === 'from' ? "Tap map to set PICKUP" : "Tap map to set DESTINATION"}
                             </Text>
                         </View>
                     )}
                </View>
            )}
        </View>
      </Animated.View>

    </View>
  );
}

// Need to import FontAwesome5 for Weight icon
import { FontAwesome5 } from '@expo/vector-icons';

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA', 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  pageSubtitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 32,
    marginTop: 10,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  
  /* Sections */
  sectionHeader: {
      marginBottom: 16,
      marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* Route Visuals */
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timeline: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 24, 
    paddingBottom: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: '#FFF',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  square: {
      width: 14,
      height: 14,
      borderRadius: 4,
      borderWidth: 3,
      backgroundColor: '#FFF',
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
    borderRadius: 1,
  },
  inputsColumn: {
      flex: 1,
      gap: 16,
  },
  
  /* Inputs */
  fieldContainer: {
      flex: 1,
  },
  fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#555',
      marginBottom: 8,
      marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  disabledInput: {
      backgroundColor: '#FAFAFA',
      shadowOpacity: 0,
      elevation: 0,
      borderColor: '#EEE',
  },
  inputIcon: {
      marginRight: 14,
      opacity: 0.8,
  },
  inputTextValue: {
      flex: 1,
      fontSize: 15,
      color: '#1A1A1A',
      fontWeight: '600',
  },
  placeholder: {
      color: '#999',
      fontWeight: '500',
  },

  /* Toggle Pills */
  toggleContainer: {
      flexDirection: 'row',
      backgroundColor: '#F0F0F0',
      borderRadius: 50,
      padding: 5,
      marginTop: 0,
      marginBottom: 32,
  },
  pillOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 40,
  },
  pillSelectedMap: {
      backgroundColor: '#4A148C', 
      shadowColor: "#4A148C",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
  },
  pillSelectedLoc: {
    backgroundColor: '#C2185B', 
    shadowColor: "#C2185B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  pillText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#777',
  },
  textSelected: {
      color: '#FFF',
  },


  /* Type Selector */
  typeSelectorContainer: {
      marginBottom: 20,
      height: 50,
  },
  typeChip: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 25,
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#EEE',
      marginRight: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      justifyContent: 'center',
  },
  typeChipSelected: {
      backgroundColor: '#4A148C',
      borderColor: '#4A148C',
      shadowColor: "#4A148C",
      shadowOpacity: 0.3,
      elevation: 4,
  },
  typeChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#555',
  },
  typeChipTextSelected: {
      color: '#FFF',
      fontWeight: '700',
  },

  /* Details Grid */
  detailsGrid: {
      gap: 16,
      flexDirection: 'row', 
      marginBottom: 0,
  },
  gridItem: {
      flex: 1,
  },
  floatingInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: '#F0F0F0',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 5,
      elevation: 1,
  },
  bareInput: {
      flex: 1,
      fontSize: 15,
      marginLeft: 12,
      color: '#333',
      fontWeight: '500',
  },

  /* Submit Button */
  submitButton: {
      backgroundColor: '#7B1FA2',
      borderRadius: 20,
      paddingVertical: 20,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 40,
      shadowColor: '#7B1FA2',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
  },
  submitDisabled: {
      backgroundColor: '#BDBDBD',
      shadowOpacity: 0,
      elevation: 0,
  },
  submitText: {
      color: '#FFF',
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.5,
  },

  /* Bottom Sheet */
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_MAX_HEIGHT,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 30,
    zIndex: 999,
    overflow: 'hidden',
  },
  sheetHandleContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  sheetHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
  },
  mapContainer: {
      flex: 1,
      backgroundColor: '#F5F5F5',
  },
  mapOverlay: {
      position: 'absolute',
      bottom: 40,
      left: 20,
      right: 20,
  },
  confirmBanner: {
      backgroundColor: '#222',
      padding: 10,
      paddingRight: 10,
      borderRadius: 50,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
      elevation: 10,
  },
  bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#444',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#555',
  },
  bannerLabel: {
      color: '#888',
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
  },
  bannerAddress: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
  },
  minimalConfirmBtn: {
      backgroundColor: '#FFF',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 30,
      marginLeft: 10,
  },
  minimalConfirmText: {
      color: '#000',
      fontWeight: '800',
      fontSize: 13,
  },
  instructionBanner: {
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.95)',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      elevation: 5,
      borderWidth: 1,
      borderColor: '#EEE',
  },
  instructionText: {
      color: '#333',
      fontSize: 14,
      fontWeight: '700',
  },
});
