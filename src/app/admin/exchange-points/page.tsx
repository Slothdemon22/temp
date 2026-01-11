/**
 * Admin Exchange Points Management Page
 * 
 * Allows admins to:
 * - View all exchange points on a map
 * - Add new exchange points
 * - Edit existing exchange points
 * - Delete/deactivate exchange points
 */

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Dynamically import map component to avoid SSR issues with Leaflet
const ExchangePointMap = dynamic(() => import('@/components/ExchangePointMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
})

interface ExchangePoint {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  country: string
  latitude: number
  longitude: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ExchangePointsPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [exchangePoints, setExchangePoints] = useState<ExchangePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPoint, setEditingPoint] = useState<ExchangePoint | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: 'Pakistan',
    latitude: '',
    longitude: '',
  })

  useEffect(() => {
    if (isAuthenticated) {
      loadExchangePoints()
    }
  }, [isAuthenticated])

  const loadExchangePoints = async () => {
    try {
      const response = await fetch('/api/exchange-points?all=true')
      const data = await response.json()
      if (response.ok) {
        setExchangePoints(data.exchangePoints || [])
      } else {
        toast.error(data.error || 'Failed to load exchange points')
      }
    } catch (error) {
      console.error('Error loading exchange points:', error)
      toast.error('Failed to load exchange points')
    } finally {
      setLoading(false)
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng })
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.address || !formData.city) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map')
      return
    }

    try {
      const url = editingPoint
        ? `/api/exchange-points/${editingPoint.id}`
        : '/api/exchange-points'
      const method = editingPoint ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(
          editingPoint
            ? 'Exchange point updated successfully'
            : 'Exchange point created successfully'
        )
        setShowAddForm(false)
        setEditingPoint(null)
        setSelectedLocation(null)
        setFormData({
          name: '',
          description: '',
          address: '',
          city: '',
          country: 'Pakistan',
          latitude: '',
          longitude: '',
        })
        loadExchangePoints()
      } else {
        toast.error(data.error || 'Failed to save exchange point')
      }
    } catch (error) {
      console.error('Error saving exchange point:', error)
      toast.error('Failed to save exchange point')
    }
  }

  const handleEdit = (point: ExchangePoint) => {
    setEditingPoint(point)
    setFormData({
      name: point.name,
      description: point.description || '',
      address: point.address,
      city: point.city,
      country: point.country,
      latitude: point.latitude.toString(),
      longitude: point.longitude.toString(),
    })
    setSelectedLocation({ lat: point.latitude, lng: point.longitude })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exchange point?')) {
      return
    }

    try {
      const response = await fetch(`/api/exchange-points/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Exchange point deleted successfully')
        loadExchangePoints()
      } else {
        toast.error(data.error || 'Failed to delete exchange point')
      }
    } catch (error) {
      console.error('Error deleting exchange point:', error)
      toast.error('Failed to delete exchange point')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Access Denied</h1>
          <p className="text-zinc-600 mb-4">Please sign in to access this page</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-28 flex items-center justify-center">
        <p className="text-zinc-500">Loading exchange points...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-28 px-4 md:px-16 lg:px-24 xl:px-32 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Exchange Points Management</h1>
          <p className="text-zinc-600">Manage physical exchange locations (stalls) for book exchanges</p>
        </div>

        {/* Map */}
        <div className="mb-6 h-96 rounded-lg overflow-hidden border border-gray-300">
          <ExchangePointMap
            exchangePoints={exchangePoints}
            onLocationSelect={showAddForm ? handleMapClick : undefined}
            selectable={showAddForm}
            selectedLocation={selectedLocation}
          />
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              {editingPoint ? 'Edit Exchange Point' : 'Add New Exchange Point'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Click on map to select</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Click on map to select</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  {editingPoint ? 'Update' : 'Create'} Exchange Point
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingPoint(null)
                    setSelectedLocation(null)
                    setFormData({
                      name: '',
                      description: '',
                      address: '',
                      city: '',
                      country: 'Pakistan',
                      latitude: '',
                      longitude: '',
                    })
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Exchange Points List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900">Exchange Points</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              + Add Exchange Point
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {exchangePoints.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No exchange points found. Click "Add Exchange Point" to create one.
              </div>
            ) : (
              exchangePoints.map((point) => (
                <div key={point.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900">{point.name}</h3>
                      <p className="text-sm text-zinc-600 mt-1">{point.address}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {point.city}, {point.country}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                      </p>
                      {point.isActive === false && (
                        <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(point)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(point.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

