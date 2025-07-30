const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

export interface GeocodeResponse {
  display_name: string;
  address: {
    postcode?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    [key: string]: string | undefined;
  };
}

export interface AddressDetails {
  fullAddress: string;
  pincode: string;
}

export async function getAddressFromCoordinates(lat: number, lon: number): Promise<AddressDetails | null> {
  try {
    // Add a zoom parameter to get more detailed results
    const url = `${NOMINATIM_BASE_URL}?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`;
    
    console.log('Fetching address from coordinates:', { lat, lon });
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FarmingApp/1.0 (React Native Mobile Application)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      throw new Error(`Geocode API error: ${response.status}`);
    }
    
    const data: GeocodeResponse = await response.json();
    console.log('Geocode API response:', JSON.stringify(data));
    
    // Extract the pincode (postcode) from the address details
    // Try multiple possible field names for postal code
    const pincode = data.address.postcode || 
                   data.address.postal_code || 
                   data.address.postalcode || 
                   data.address.zip || 
                   data.address.zipcode || 
                   '';
    
    console.log('Extracted pincode:', pincode);
    
    // Return both the full address and the pincode
    return {
      fullAddress: data.display_name || '',
      pincode: pincode
    };
  } catch (error) {
    console.error('Error fetching address from coordinates:', error);
    return null;
  }
}
