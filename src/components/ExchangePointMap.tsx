/**
 * Exchange Point Map Component
 * 
 * Interactive map for selecting and displaying exchange points.
 * Uses react-leaflet for map integration.
 */

'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
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
  isActive?: boolean
}

interface ExchangePointMapProps {
  exchangePoints?: ExchangePoint[]
  onLocationSelect?: (lat: number, lng: number) => void
  initialCenter?: [number, number]
  initialZoom?: number
  selectable?: boolean
  selectedLocation?: { lat: number; lng: number } | null
}

// Component to handle map clicks when selectable
function LocationSelector({
  onLocationSelect,
  selectedLocation,
}: {
  onLocationSelect?: (lat: number, lng: number) => void
  selectedLocation?: { lat: number; lng: number } | null
}) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng)
      }
    },
  })

  return selectedLocation ? (
    <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
  ) : null
}

export default function ExchangePointMap({
  exchangePoints = [],
  onLocationSelect,
  initialCenter = [31.5204, 74.3587], // Default to Lahore, Pakistan
  initialZoom = 13,
  selectable = false,
  selectedLocation = null,
}: ExchangePointMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Display exchange points */}
        {exchangePoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">{point.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{point.address}</p>
                <p className="text-xs text-gray-500">{point.city}</p>
                {point.isActive === false && (
                  <p className="text-xs text-red-500 mt-1">Inactive</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Location selector for adding new points */}
        {selectable && (
          <LocationSelector
            onLocationSelect={onLocationSelect}
            selectedLocation={selectedLocation}
          />
        )}
      </MapContainer>
    </div>
  )
}

