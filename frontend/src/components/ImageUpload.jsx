import React, { useState, useRef, useEffect } from 'react'
import { Upload, Image, X, Loader, Trash2, Plus } from 'lucide-react'
import { apiService } from '../services/apiService'

const ImageUpload = ({ language, onPrediction }) => {
  const [selectedImages, setSelectedImages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [processingIndex, setProcessingIndex] = useState(-1)
  const [results, setResults] = useState([])
  const [predictionString, setPredictionString] = useState('')
  const [backendStatus, setBackendStatus] = useState(null)
  const fileInputRef = useRef(null)

  // Check backend connectivity on component mount
  useEffect(() => {
    checkBackendConnectivity()
  }, [])

  const checkBackendConnectivity = async () => {
    try {
      console.log('Checking backend connectivity for image upload...')
      const available = await apiService.isBackendAvailable()
      
      if (available) {
        console.log('Backend is available for image upload')
        setBackendStatus('connected')
        try {
          const status = await apiService.getApiStatus()
          console.log('Backend status for image upload:', status)
        } catch (err) {
          console.warn('Could not get full backend status:', err)
        }
      } else {
        console.log('Backend is not available for image upload')
        setBackendStatus('disconnected')
        setError('Backend server tidak tersedia. Pastikan server Python berjalan.')
      }
    } catch (err) {
      console.error('Backend connectivity check failed for image upload:', err)
      setBackendStatus('error')
      setError(`Backend error: ${err.message}`)
    }
  }

  // Handle file selection (multiple/additive)
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    if (files.length > 0) {
      addImagesToCollection(files)
    }
  }

  // Handle drag and drop (multiple/additive)
  const handleDrop = (event) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      addImagesToCollection(files)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  // Add images to collection (additive behavior)
  const addImagesToCollection = (files) => {
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']
    const maxSize = 10 * 1024 * 1024 // 10MB per file
    
    const validFiles = []
    const errors = []

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`)
      } else if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max 10MB)`)
      } else {
        validFiles.push(file)
      }
    })

    if (errors.length > 0) {
      setError(errors.join(', '))
      return
    }

    // Check total limit (current + new)
    if (selectedImages.length + validFiles.length > 10) {
      setError(`Maximum 10 images total. You have ${selectedImages.length}, trying to add ${validFiles.length}`)
      return
    }

    setError(null)

    // Create image objects with previews
    const imagePromises = validFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            status: 'ready',
            result: null,
            error: null
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(imagePromises).then((newImages) => {
      setSelectedImages(prev => [...prev, ...newImages])
    })
  }

  // Remove single image
  const removeImage = (id) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id))
    setResults(prev => prev.filter(result => result.imageId !== id))
  }

  // Clear all images
  const clearAllImages = () => {
    setSelectedImages([])
    setResults([])
    setPredictionString('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // FIXED: Use exact same preprocessing as CameraCapture
  const preprocessImageForPrediction = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Use exact same dimensions as CameraCapture
          canvas.width = 1280
          canvas.height = 720

          // Clear canvas and set same rendering properties
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Calculate scaling to fit image in 1280x720 maintaining aspect ratio
          const targetWidth = canvas.width
          const targetHeight = canvas.height
          const sourceWidth = img.width
          const sourceHeight = img.height

          const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
          const scaledWidth = sourceWidth * scale
          const scaledHeight = sourceHeight * scale

          // Center the image
          const offsetX = (targetWidth - scaledWidth) / 2
          const offsetY = (targetHeight - scaledHeight) / 2

          // Draw image centered (no mirroring for uploaded images)
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

          // Apply EXACT same contrast enhancement as CameraCapture
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.1 + 128))
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.1 + 128))
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.1 + 128))
          }
          
          ctx.putImageData(imageData, 0, 0)

          // Convert to blob with exact same quality as CameraCapture
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/jpeg', 0.92)

        } catch (error) {
          reject(new Error(`Image processing failed: ${error.message}`))
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image for processing'))
      }

      // Load image from file
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })
  }

  // Predict all images (batch processing)
  const predictAllImages = async () => {
    if (selectedImages.length === 0) return

    if (backendStatus !== 'connected') {
      setError('Backend tidak tersedia. Cek koneksi ke server Python.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults([])
    setPredictionString('')

    const newResults = []
    const predictionLetters = []

    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i]
      setProcessingIndex(i)

      // Update image status
      setSelectedImages(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { ...img, status: 'processing' }
            : img
        )
      )

      try {
        console.log(`Processing image ${i + 1}/${selectedImages.length}: ${image.name}`)

        // Use exact same preprocessing as CameraCapture
        const processedBlob = await preprocessImageForPrediction(image.file)
        
        // Make prediction with processed blob (no mirror for uploads)
        const result = await apiService.predictImage(processedBlob, language, false)
        
        const resultData = {
          imageId: image.id,
          imageName: image.name,
          imagePreview: image.preview,
          result: result,
          timestamp: new Date()
        }

        newResults.push(resultData)

        // Collect successful predictions for string
        if (result.success && result.prediction && result.prediction !== "No hand detected") {
          predictionLetters.push(result.prediction)
        }

        // Update image status
        setSelectedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'completed', result: result }
              : img
          )
        )

        // Send individual result to parent (for history)
        onPrediction(result, image.preview)

        console.log(`Image ${i + 1} result:`, result.prediction, `(${(result.confidence * 100).toFixed(1)}%)`)

        // Small delay between requests
        if (i < selectedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (err) {
        console.error(`Error processing ${image.name}:`, err)
        
        let errorMessage = err.message || 'Failed to predict image'
        
        if (err.message.includes('Network error')) {
          errorMessage = 'Tidak bisa menghubungi server. Pastikan backend Python berjalan.'
          setBackendStatus('disconnected')
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Server terlalu lama merespons. Coba lagi.'
        }
        
        const errorResult = {
          imageId: image.id,
          imageName: image.name,
          imagePreview: image.preview,
          result: { success: false, error: errorMessage },
          timestamp: new Date()
        }

        newResults.push(errorResult)

        // Update image status
        setSelectedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'error', error: errorMessage }
              : img
          )
        )
      }
    }

    setResults(newResults)
    
    // Build prediction string (e.g., "A L V I N")
    const finalString = predictionLetters.join(' ')
    setPredictionString(finalString)
    
    setIsLoading(false)
    setProcessingIndex(-1)

    console.log('Batch processing complete. Final string:', finalString)
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-gray-100 text-gray-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'error': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-4">
      {/* Backend Status Indicator */}
      {backendStatus && (
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 
              backendStatus === 'disconnected' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></div>
            <span className="text-sm font-medium">
              {
                backendStatus === 'connected' ? 'Connected' :
                backendStatus === 'disconnected' ? 'Disconnected' :
                'Checking...'
              }
            </span>
          </div>
          
          {backendStatus !== 'connected' && (
            <button
              onClick={checkBackendConnectivity}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Multiple Image Upload</h3>
          <div className="flex items-center gap-2">
            {selectedImages.length > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={clearAllImages}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              title="Add more images"
              disabled={backendStatus !== 'connected'}
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-red-500">Warning:</span>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Zone or Image Grid */}
        {selectedImages.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              backendStatus === 'connected' 
                ? 'border-gray-300 hover:border-blue-400 cursor-pointer' 
                : 'border-gray-200 cursor-not-allowed bg-gray-50'
            }`}
            onDrop={backendStatus === 'connected' ? handleDrop : undefined}
            onDragOver={backendStatus === 'connected' ? handleDragOver : undefined}
            onClick={backendStatus === 'connected' ? () => fileInputRef.current?.click() : undefined}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${
              backendStatus === 'connected' ? 'text-gray-400' : 'text-gray-300'
            }`} />
            <h4 className={`text-lg font-medium mb-2 ${
              backendStatus === 'connected' ? 'text-gray-700' : 'text-gray-400'
            }`}>
              {backendStatus === 'connected' ? 'Drop your images here' : 'Backend not connected'}
            </h4>
            <p className={`mb-4 ${
              backendStatus === 'connected' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {backendStatus === 'connected' ? 'atau klik untuk memilih files' : 'Connect to backend first'}
            </p>
            <p className="text-sm text-gray-400">
              Format: JPG, PNG, BMP • Max: 10MB per file • Up to 10 images total
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Enhanced preprocessing matching camera mode for better accuracy
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={backendStatus !== 'connected'}
            />
          </div>
        ) : (
          /* Image Grid with Add Zone */
          <div className="space-y-4">
            {/* Processing Status */}
            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    Processing {processingIndex + 1}/{selectedImages.length}...
                  </span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Using enhanced preprocessing for better accuracy
                </p>
              </div>
            )}

            {/* Image Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {selectedImages.map((image, index) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(image.status)}`}>
                    {image.status === 'processing' && <Loader className="w-3 h-3 animate-spin inline mr-1" />}
                    {image.status === 'ready' && 'Ready'}
                    {image.status === 'completed' && 'Done'}
                    {image.status === 'error' && 'Error'}
                    {' '}{index + 1}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isLoading}
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* File Info */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 truncate" title={image.name}>
                      {image.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(image.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  {/* Result */}
                  {image.result && (
                    <div className="mt-1">
                      {image.result.success ? (
                        <div className="text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {image.result.prediction}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {(image.result.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-red-500">
                          {image.error || 'Failed'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add More Zone (if less than 10) */}
              {selectedImages.length < 10 && backendStatus === 'connected' && (
                <div
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Add More</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={predictAllImages}
                disabled={isLoading || selectedImages.length === 0 || backendStatus !== 'connected'}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing {processingIndex + 1}/{selectedImages.length}...
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    Predict All ({selectedImages.length})
                  </>
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={backendStatus !== 'connected'}
            />
          </div>
        )}
      </div>

      {/* Prediction String Display */}
      {predictionString && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-medium text-green-900 mb-4 text-center">Hasil Terjemahan:</h4>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2 tracking-widest">
              {predictionString}
            </div>
            <p className="text-green-700 text-sm">
              {predictionString.replace(/\s/g, '').length} huruf berhasil diterjemahkan
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(predictionString.replace(/\s/g, ''))
                alert('Hasil disalin ke clipboard!')
              }}
              className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              Copy Hasil
            </button>
          </div>
        </div>
      )}

      {/* Batch Results Summary */}
      {results.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">Batch Results Summary:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {results.length}
              </div>
              <div className="text-blue-700">Total Processed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {results.filter(r => r.result.success).length}
              </div>
              <div className="text-green-700">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {results.filter(r => !r.result.success).length}
              </div>
              <div className="text-red-700">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-600">
                {results.filter(r => r.result.success).length > 0 
                  ? (results.filter(r => r.result.success).reduce((acc, r) => acc + r.result.confidence, 0) / results.filter(r => r.result.success).length * 100).toFixed(0)
                  : 0}%
              </div>
              <div className="text-gray-700">Avg Confidence</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Petunjuk Penggunaan:</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Upload multiple images (maksimal 10 files)</li>
          <li>• Menggunakan preprocessing yang sama dengan camera mode untuk akurasi maksimal</li>
          <li>• Format yang didukung: JPG, PNG, BMP (maksimal 10MB per file)</li>
          <li>• Batch processing akan memproses semua gambar secara berurutan</li>
          <li>• Hasil akan ditampilkan sebagai string huruf yang terbaca</li>
        </ul>
      </div>
    </div>
  )
}

export default ImageUpload
