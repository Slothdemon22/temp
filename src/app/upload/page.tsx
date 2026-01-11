'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bucketName] = useState('rifah-bucket') // Rifah bucket

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Validate file type (images only)
      if (!selectedFile.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 10MB for images)
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 10MB')
        return
      }
      
      setFile(selectedFile)
      setError(null)
      setUploadedUrl(null)
      setUploadedFileType(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Images go to images folder
      const folder = 'images'
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Simulate upload progress
      setUploadProgress(30)
      
      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      setUploadProgress(70)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      setUploadedUrl(urlData.publicUrl)
      setUploadedFileType(file.type)
      setUploadProgress(100)
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Upload Image
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload images to the <span className="font-semibold text-blue-600 dark:text-blue-400">rifah-bucket</span> bucket
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-500">
                Images → <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">images/</code> directory
              </span>
            </p>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Image
            </label>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-600 dark:file:text-white"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>

          {/* Uploaded File Preview */}
          {uploadedUrl && uploadedFileType && (
            <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                ✅ Image uploaded successfully!
              </p>
              <div className="mt-4">
                <img
                  src={uploadedUrl}
                  alt="Uploaded"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={uploadedUrl}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(uploadedUrl)
                      toast.success('URL copied to clipboard!')
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

