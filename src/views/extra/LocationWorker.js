import * as Location from 'expo-location';

class LocationWorker {
  constructor() {
    this.location = null;
    this.address = null;
    this.initialized = false;
    this.locationData = null;
	this.locationDenied = false;
  }

  async initialize() {
    // If already initialized, return cached data from instance
    if (this.initialized && !this.locationDenied) {
      return this.locationData;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      this.locationDenied = true;
	  return null;
    }
    
    this.location = await Location.getCurrentPositionAsync({});
    console.log(this.location);
    
    const addressData = await Location.reverseGeocodeAsync({
      latitude: this.location.coords.latitude,
      longitude: this.location.coords.longitude,
    });
    
    if (addressData.length > 0) {
      const { district, city, region, country } = addressData[0];
      this.address = `${district}, ${city}, ${region}, ${country}`;
    }
    
    // Store the result in instance
    this.locationData = {
      location: this.location,
      address: this.address
    };
    this.initialized = true;
    
    return this.locationData;
  }

  getLocationString() {
    if (!this.location) {
      return null;
    }
    return `${this.location.coords.latitude},${this.location.coords.longitude}`;
  }

  // Get cached location data from instance
  getLocationData() {
    return this.locationData;
  }
  
  getLocationAddress() {
	return this.address;
  }

  // Check if location has been initialized
  isInitialized() {
    return this.initialized;
  }
  
  isLocationDenied() {
	return this.locationDenied;
  }

  // Clear location data from instance
  clearLocation() {
    this.location = null;
    this.address = null;
    this.locationData = null;
    this.initialized = false;
	this.locationDenied = false;
  }
}

// Export the class
export default LocationWorker;

// Export singleton instance for global use
export const locationWorkerInstance = new LocationWorker();