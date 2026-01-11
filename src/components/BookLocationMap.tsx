/**
 * Book Location Map Component
 * 
 * Shows book location and nearby exchange points on a map.
 * Uses Leaflet + OpenStreetMap.
 */

'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface ExchangePoint {
  id: string
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
}

interface BookLocationMapProps {
  bookLocation: string // City/region name
  exchangePoints?: ExchangePoint[]
  height?: string
}

// Default coordinates for major Pakistani cities (fallback)
// Format: 'CityName': [latitude, longitude]
// You can add more cities here - just use the city name when adding a book
const CITY_COORDINATES: Record<string, [number, number]> = {
  'Lahore': [31.5204, 74.3587],
  'Karachi': [24.8607, 67.0011],
  'Islamabad': [33.6844, 73.0479],
  'Rawalpindi': [33.5651, 73.0169],
  'Faisalabad': [31.4504, 73.1350],
  'Multan': [30.1575, 71.5249],
  'Peshawar': [34.0151, 71.5249],
  'Quetta': [30.1798, 66.9750],
  'Sialkot': [32.4945, 74.5229],
  'Gujranwala': [32.1617, 74.1883],
  // Add more cities here as needed
  // Example: 'Hyderabad': [25.3960, 68.3578],
}

export default function BookLocationMap({
  bookLocation,
  exchangePoints = [],
  height = '300px',
}: BookLocationMapProps) {
  const [mounted, setMounted] = useState(false)
  const [center, setCenter] = useState<[number, number]>([31.5204, 74.3587]) // Default to Lahore
  const [zoom, setZoom] = useState(12)
  const [bookCoordinates, setBookCoordinates] = useState<[number, number] | null>(null)
  const [isCoordinateFormat, setIsCoordinateFormat] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if location is in coordinate format: "lat,lng" or "latitude,longitude"
    // Examples: "31.5204,74.3587" or "31.5204, 74.3587"
    const coordinateMatch = bookLocation.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    
    if (coordinateMatch) {
      // User provided exact coordinates
      const lat = parseFloat(coordinateMatch[1])
      const lng = parseFloat(coordinateMatch[2])
      
      // Validate coordinates
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const coords: [number, number] = [lat, lng]
        setCenter(coords)
        setBookCoordinates(coords)
        setIsCoordinateFormat(true)
        setZoom(14) // Zoom in more for exact coordinates
        return
      }
    }

    // Reset coordinate format flag
    setIsCoordinateFormat(false)
    setBookCoordinates(null)

    // Try to find coordinates for the book's location (city name matching)
    const locationKey = Object.keys(CITY_COORDINATES).find(
      (city) => bookLocation.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(bookLocation.toLowerCase())
    )

    if (locationKey) {
      const coords = CITY_COORDINATES[locationKey]
      setCenter(coords)
      setBookCoordinates(coords)
      setZoom(12)
    } else if (exchangePoints.length > 0) {
      // Use first exchange point as center if available
      setCenter([exchangePoints[0].latitude, exchangePoints[0].longitude])
      setZoom(11)
    }
  }, [bookLocation, exchangePoints])

  if (!mounted) {
    return (
      <div className="w-full bg-gray-200 flex items-center justify-center rounded-lg" style={{ height }}>
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  // Filter exchange points - if coordinates, show all nearby points
  // If city name, filter by city match
  const nearbyExchangePoints = isCoordinateFormat
    ? exchangePoints // Show all exchange points when using coordinates
    : exchangePoints.filter((point) =>
        point.city.toLowerCase().includes(bookLocation.toLowerCase()) ||
        bookLocation.toLowerCase().includes(point.city.toLowerCase())
      )

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Book location marker (if we have coordinates) */}
        {bookCoordinates && (
          <Marker position={bookCoordinates}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">📚 Book Location</h3>
                <p className="text-xs text-gray-600 mt-1">{bookLocation}</p>
                {isCoordinateFormat && (
                  <p className="text-xs text-gray-500 mt-1">
                    {bookCoordinates[0]}, {bookCoordinates[1]}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Nearby exchange points */}
        {nearbyExchangePoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">📍 {point.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{point.address}</p>
                <p className="text-xs text-gray-500">{point.city}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

