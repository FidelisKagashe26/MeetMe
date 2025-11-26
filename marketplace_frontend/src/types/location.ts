// src/types/location.ts
export interface LocationFormValue {
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude: string;
  longitude: string;
  mapbox_place_id?: string;
}
