import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function LocationTracker() {
    const { user } = useAuth();
    const [isTracking, setIsTracking] = useState(false);
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

    useEffect(() => {
        if (!user) return;

        // Check constantly or subscribe to changes? 
        // For simplicity and to avoid over-fetching, we'll poll for "in_transit" packages
        // every 10 seconds, OR we can listen to realtime changes on the 'packages' table.
        // Let's poll for active deliveries to decide if we should track.

        const checkActiveDeliveries = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('packages')
                    .select('id')
                    .eq('deliverer_id', user.id)
                    .eq('status', 'in_transit');

                if (error) {
                    console.error("Tracker Check Error:", JSON.stringify(error));
                    return;
                }

                const activePackageIds = data?.map(p => p.id) || [];

                if (activePackageIds.length > 0) {
                    startTracking(activePackageIds);
                } else {
                    stopTracking();
                }

            } catch (e) {
                console.error(e);
            }
        };

        const interval = setInterval(checkActiveDeliveries, 10000); // Check every 10 sec
        checkActiveDeliveries(); // Initial check

        return () => {
            clearInterval(interval);
            stopTracking();
        };
    }, [user]);

    const startTracking = async (packageIds: number[]) => {
        if (isTracking) {
             // Already tracking, maybe just update the list of IDs if needed?
             // For simplicity, the watcher callback will just update "any in_transit by this user" 
             // or we can pass the IDs to the callback ref.
             // Actually, simplest is: update ALL packages by this driver that are in_transit.
             return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log("Permission to access location was denied");
            return;
        }

        console.log("Starting Driver Tracker...");
        setIsTracking(true);

        subscriptionRef.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000, // Update every 5 seconds
                distanceInterval: 10, // Or every 10 meters
            },
            async (location) => {
                console.log("Location Update:", location.coords.latitude, location.coords.longitude);
                
                // Update Supabase
                try {
                    const { error } = await supabase
                        .from('packages')
                        .update({
                            current_latitude: location.coords.latitude,
                            current_longitude: location.coords.longitude
                        })
                        .eq('deliverer_id', user!.id)
                        .eq('status', 'in_transit');

                    if (error) console.error("Location Update DB Error:", error);

                } catch (err) {
                    console.error("Location Update Failed:", err);
                }
            }
        );
    };

    const stopTracking = () => {
        if (isTracking) {
            console.log("Stopping Driver Tracker...");
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
                subscriptionRef.current = null;
            }
            setIsTracking(false);
        }
    };

    return null; // Invisible component
}
