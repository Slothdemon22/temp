/**
 * Add Book Page
 * 
 * Authenticated users can add books to the platform.
 * Upon creation, the user becomes the current owner.
 * 
 * This page is protected by middleware - only authenticated users can access it.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addBookAction } from '@/app/actions/books'
import type { BookCondition } from '@/lib/books'
import BackButton from '@/components/back-button'

const BOOK_CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: 'POOR', label: 'Poor - Significant wear' },
  { value: 'FAIR', label: 'Fair - Noticeable wear' },
  { value: 'GOOD', label: 'Good - Minor wear' },
  { value: 'EXCELLENT', label: 'Excellent - Like new' },
]

export default function AddBookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [error, setError] = useState('')

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    condition: 'GOOD' as BookCondition,
    location: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      
      // Validate files
      const validFiles: File[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not an image file`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} exceeds 5MB size limit`)
          continue
        }
        validFiles.push(file)
      }

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles)
        setError('')
      }
    }
  }

  const handleUploadImages = async () => {
    if (selectedFiles.length === 0) return

    setUploadingImages(true)
    setError('')

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('images', file)
      })

      const response = await fetch('/api/upload/images?bookId=temp', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload images')
      }

      setUploadedImageUrls([...uploadedImageUrls, ...data.urls])
      setSelectedFiles([])
    } catch (err: any) {
      setError(err.message || 'Failed to upload images')
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create FormData object for server action
      const formDataObj = new FormData()
      formDataObj.append('title', formData.title)
      formDataObj.append('author', formData.author)
      formDataObj.append('description', formData.description)
      formDataObj.append('condition', formData.condition)
      formDataObj.append('images', uploadedImageUrls.join(','))
      formDataObj.append('location', formData.location)

      const result = await addBookAction(formDataObj)

      if (!result.success) {
        setError(result.error || 'Failed to add book')
        setLoading(false)
        return
      }

      // Success - redirect to books page
      router.push('/books')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-2xl mx-auto">
        <BackButton href="/books" />
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-urbanist font-bold text-zinc-900 mb-2">
            Add a Book
          </h1>
          <p className="text-zinc-500">
            Share a book with the community. You'll become its owner.
          </p>
        </div>

        <div className="bg-white/50 backdrop-blur border border-gray-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="The Great Gatsby"
              />
            </div>

            <div>
              <label
                htmlFor="author"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Author <span className="text-red-500">*</span>
              </label>
              <input
                id="author"
                type="text"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="F. Scott Fitzgerald"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="Brief description of the book..."
              />
            </div>

            <div>
              <label
                htmlFor="condition"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                id="condition"
                value={formData.condition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    condition: e.target.value as BookCondition,
                  })
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              >
                {BOOK_CONDITIONS.map((condition) => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Location <span className="text-red-500">*</span>
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="New York, NY"
              />
              <p className="mt-1 text-xs text-zinc-500">
                City or region where the book is located
              </p>
            </div>

            <div>
              <label
                htmlFor="images"
                className="block text-sm font-medium text-zinc-700 mb-2"
              >
                Images (optional)
              </label>
              
              {/* File Input */}
              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-zinc-900 hover:file:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
              
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-zinc-600">
                    Selected: {selectedFiles.length} file(s)
                  </p>
                  <button
                    type="button"
                    onClick={handleUploadImages}
                    disabled={uploadingImages}
                    className="px-4 py-2 bg-linear-to-tl from-orange-600 to-orange-500 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                  >
                    {uploadingImages ? 'Uploading...' : 'Upload Images'}
                  </button>
                </div>
              )}

              {/* Uploaded Images Preview */}
              {uploadedImageUrls.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-zinc-700">
                    Uploaded Images ({uploadedImageUrls.length}):
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-zinc-500">
                Upload images of your book (max 5MB per image)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-3 px-4 rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
            >
              {loading ? 'Adding Book...' : 'Add Book'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

