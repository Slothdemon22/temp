/**
 * Add Book Page
 * 
 * Authenticated users can add books to the platform.
 * Upon creation, the user becomes the current owner.
 * 
 * This page is protected by middleware - only authenticated users can access it.
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { addBookAction } from '@/app/actions/books'
import type { BookCondition } from '@/lib/books'
import BackButton from '@/components/back-button'
import { toast } from 'sonner'
import { Upload, X, Image as ImageIcon, MapPin } from 'lucide-react'

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
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    condition: 'GOOD' as BookCondition,
    location: '',
  })
  const [chapters, setChapters] = useState<string[]>(['', '', '']) // Minimum 3 chapters

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: File[] = []
    const previews: string[] = []

    acceptedFiles.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB size limit`)
        return
      }

      validFiles.push(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        previews.push(reader.result as string)
        if (previews.length === validFiles.length) {
          setImagePreviews([...imagePreviews, ...previews])
        }
      }
      reader.readAsDataURL(file)
    })

    if (validFiles.length > 0) {
      setSelectedFiles([...selectedFiles, ...validFiles])
      setError('')
      toast.success(`${validFiles.length} image(s) selected`)
    }
  }, [selectedFiles, imagePreviews])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    multiple: true,
    maxSize: 5 * 1024 * 1024, // 5MB
  })


  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate location is not empty
    if (!formData.location.trim()) {
      setError('Location is required')
      toast.error('Please enter a location (city name or coordinates)')
      return
    }

    setLoading(true)

    try {
      // Validate chapters - minimum 3 non-empty
      const validChapters = chapters
        .map(ch => ch.trim())
        .filter(ch => ch.length > 0)

      if (validChapters.length < 3) {
        setError('At least 3 chapters are required')
        toast.error('Please add at least 3 chapters')
        setLoading(false)
        return
      }

      // Auto-upload images if there are selected files
      let finalImageUrls = [...uploadedImageUrls]
      if (selectedFiles.length > 0) {
        setUploadingImages(true)
        try {
          const uploadFormData = new FormData()
          selectedFiles.forEach((file) => {
            uploadFormData.append('images', file)
          })

          const uploadResponse = await fetch('/api/upload/images?bookId=temp', {
            method: 'POST',
            body: uploadFormData,
          })

          const uploadData = await uploadResponse.json()

          if (!uploadResponse.ok || !uploadData.success) {
            throw new Error(uploadData.error || 'Failed to upload images')
          }

          finalImageUrls = [...uploadedImageUrls, ...uploadData.urls]
          setUploadedImageUrls(finalImageUrls)
          setSelectedFiles([])
          setImagePreviews([])
        } catch (uploadErr: any) {
          const uploadErrorMessage = uploadErr.message || 'Failed to upload images'
          setError(uploadErrorMessage)
          toast.error(uploadErrorMessage)
          setLoading(false)
          setUploadingImages(false)
          return
        } finally {
          setUploadingImages(false)
        }
      }

      // Create FormData object for server action
      const formDataObj = new FormData()
      formDataObj.append('title', formData.title.trim())
      formDataObj.append('author', formData.author.trim())
      formDataObj.append('description', formData.description.trim())
      formDataObj.append('condition', formData.condition)
      formDataObj.append('images', finalImageUrls.join(','))
      formDataObj.append('location', formData.location.trim())
      formDataObj.append('chapters', JSON.stringify(validChapters))

      const result = await addBookAction(formDataObj)

      if (!result.success) {
        throw new Error(result.error || 'Failed to add book')
      }

      toast.success('Book added successfully!')
      router.push('/books')
      router.refresh()
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-16 px-4 md:px-16 lg:px-24 xl:px-32">
      <div className="max-w-3xl mx-auto">
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

            {/* Title */}
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

            {/* Author */}
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

            {/* Description */}
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                placeholder="Brief description of the book..."
              />
            </div>

            {/* Chapters - Minimum 3 required */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Chapters <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-zinc-500 ml-2">
                  (Minimum 3 required, you can add more)
                </span>
              </label>
              <div className="space-y-3">
                {chapters.map((chapter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-sm text-zinc-500 w-8">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={chapter}
                      onChange={(e) => {
                        const newChapters = [...chapters]
                        newChapters[index] = e.target.value
                        setChapters(newChapters)
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder={`Chapter ${index + 1} title...`}
                      required={index < 3}
                    />
                    {chapters.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setChapters(chapters.filter((_, i) => i !== index))
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove chapter"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setChapters([...chapters, ''])}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-zinc-600 hover:border-orange-400 hover:text-orange-500 transition-colors text-sm font-medium"
                >
                  + Add Another Chapter
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Enter at least 3 chapter titles. You can add more chapters if needed.
              </p>
            </div>

            {/* Condition */}
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

            {/* Location - Mandatory */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-orange-500" />
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
                placeholder="Lahore or 31.5204,74.3587"
              />
              <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                City name (e.g., "Lahore") or exact coordinates (e.g., "31.5204,74.3587")
              </p>
            </div>

            {/* Image Upload Dropzone */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                Images (optional)
              </label>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isDragActive
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full ${isDragActive ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-8 h-8 ${isDragActive ? 'text-orange-500' : 'text-gray-400'}`} />
                  </div>
                  {isDragActive ? (
                    <p className="text-orange-600 font-medium">Drop images here...</p>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-zinc-700 mb-1">
                          Drag & drop images here, or click to select
                        </p>
                        <p className="text-xs text-zinc-500">
                          PNG, JPG, GIF, WEBP up to 5MB each
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Selected Files Preview (will be uploaded on submit) */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-zinc-700">
                    Selected: {selectedFiles.length} file(s) - will be uploaded when you submit
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          {imagePreviews[index] ? (
                            <img
                              src={imagePreviews[index]}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedFile(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <p className="mt-1 text-xs text-zinc-500 truncate">{file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Images Preview */}
              {uploadedImageUrls.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-zinc-700">
                    Uploaded Images ({uploadedImageUrls.length}):
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uploadedImageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={url}
                            alt={`Uploaded ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-2 text-xs text-zinc-500">
                You can upload multiple images. Maximum 5MB per image.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-tl from-orange-600 to-orange-500 text-white font-semibold py-3 px-4 rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {uploadingImages ? 'Uploading images...' : 'Adding Book...'}
                </>
              ) : (
                'Add Book'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
