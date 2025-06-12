import React, { useState, useRef, useEffect } from 'react'
import { Upload, Image, X, Loader, Trash2, Plus, RefreshCw, Type, Copy, Space } from 'lucide-react'
import { apiService } from '../services/apiService'

const ImageUpload = ({ language, onPrediction }) => {
  const [selectedImages, setSelectedImages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [processingIndex, setProcessingIndex] = useState(-1)
  const [results, setResults] = useState([])
  const [predictionString, setPredictionString] = useState('')
  const fileInputRef = useRef(null)
  const canvasRef = useRef(document.createElement('canvas'))
  const [backendStatus, setBackendStatus] = useState(null)
  
  // Letter sequence system
  const [letterSequence, setLetterSequence] = useState([])
  const lastPredictionRef = useRef(0)
  const [sequenceHistory, setSequenceHistory] = useState([])

  // Debug log state untuk membantu debugging
  const [debugLog, setDebugLog] = useState([])

  // Check backend connectivity on component mount
  useEffect(() => {
    checkBackendConnectivity()
  }, [])

  const addDebugLog = (message) => {
    console.log(message) // Log ke console
    setDebugLog(prev => [...prev, { time: new Date().toISOString(), message }])
  }

  const checkBackendConnectivity = async () => {
    try {
      addDebugLog('Checking backend connectivity...')
      const available = await apiService.isBackendAvailable()
      
      if (available) {
        addDebugLog('Backend is available')
        setBackendStatus('connected')
        try {
          const status = await apiService.getApiStatus()
          addDebugLog(`Backend status: ${JSON.stringify(status)}`)
        } catch (err) {
          addDebugLog(`Could not get full backend status: ${err.message}`)
        }
      } else {
        addDebugLog('Backend is not available')
        setBackendStatus('disconnected')
        setError('Backend server tidak tersedia. Pastikan server Python berjalan.')
      }
    } catch (err) {
      addDebugLog(`Backend connectivity check failed: ${err.message}`)
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
      addDebugLog(`Added ${newImages.length} new images. Total: ${selectedImages.length + newImages.length}`)
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
    setLetterSequence([])
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    addDebugLog('Cleared all images and results')
  }

  // Letter sequence functions
  const addLetterToSequence = (prediction, confidence) => {
    const currentTime = Date.now()
    
    // Skip "No hand detected" predictions
    if (!prediction || prediction === "No hand detected" || prediction === "None") {
      addDebugLog(`Skipping invalid prediction: "${prediction}"`)
      return false
    }
    
    // Universal cooldown
    if (currentTime - lastPredictionRef.current < 2500) {
      addDebugLog(`Cooldown active, skipping: ${prediction} (${currentTime - lastPredictionRef.current}ms ago)`)
      return false
    }
    
    // Check for exact same letter in last 5 seconds
    const recentSame = letterSequence.find(item => 
      item.letter === prediction && 
      (currentTime - new Date(item.timestamp).getTime()) < 5000
    )
    
    if (recentSame) {
      addDebugLog(`Duplicate blocked: ${prediction} already exists in last 5 seconds`)
      return false
    }
    
    // Low confidence threshold - REDUCED FOR TESTING
    if (confidence >= 0.1) {
      const newLetter = {
        id: currentTime,
        letter: prediction,
        confidence: confidence,
        timestamp: new Date(),
        source: 'upload'
      }
      
      setSequenceHistory(prev => [...prev.slice(-9), [...letterSequence]])
      setLetterSequence(prev => {
        const newSequence = [...prev, newLetter]
        addDebugLog(`Letter added: ${prediction} (${(confidence * 100).toFixed(1)}%) from upload mode - Total: ${newSequence.length}`)
        return newSequence
      })
      
      lastPredictionRef.current = currentTime
      return true
    } else {
      addDebugLog(`Confidence too low: ${prediction} (${(confidence * 100).toFixed(1)}%)`)
      return false
    }
  }

  const clearSequence = () => {
    setSequenceHistory(prev => [...prev.slice(-9), [...letterSequence]])
    setLetterSequence([])
    addDebugLog('Letter sequence cleared')
  }

  const undoLastLetter = () => {
    if (sequenceHistory.length > 0) {
      const previousSequence = sequenceHistory[sequenceHistory.length - 1]
      setLetterSequence(previousSequence)
      setSequenceHistory(prev => prev.slice(0, -1))
      addDebugLog('Undid last letter')
    }
  }

  const addSpaceToSequence = () => {
    const spaceItem = {
      id: Date.now(),
      letter: ' ',
      confidence: 1.0,
      timestamp: new Date(),
      isSpace: true,
      source: 'manual'
    }
    
    setSequenceHistory(prev => [...prev.slice(-9), [...letterSequence]])
    setLetterSequence(prev => [...prev, spaceItem])
    
    addDebugLog('Space added to sequence')
  }

  const copySequenceText = () => {
    const text = letterSequence.map(item => item.letter).join('')
    navigator.clipboard.writeText(text)
    alert('Text copied to clipboard!')
  }

  // IMPROVED: Image processing function dengan debugging dan opsi yang lebih lengkap
  const preprocessImageForPrediction = (file) => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          addDebugLog(`Processing image: ${file.name}, size: ${file.size} bytes`)
          addDebugLog(`Original dimensions: ${img.width}x${img.height}`)
          
          // Set canvas size - IDENTIK dengan camera preprocessing
          canvas.width = 640
          canvas.height = 480

          addDebugLog(`Canvas set to: ${canvas.width}x${canvas.height}`)

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Draw image (no mirroring for uploaded images)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          addDebugLog('Image drawn to canvas')

          // CRITICAL: Apply IDENTICAL contrast enhancement as camera_test.py
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.1 + 128))
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.1 + 128))
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.1 + 128))
          }
          
          ctx.putImageData(imageData, 0, 0)
          addDebugLog('Contrast enhancement applied')

          // Convert to blob with same quality as camera
          canvas.toBlob((blob) => {
            if (blob) {
              addDebugLog(`Blob created: ${blob.size} bytes`)
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob from canvas'))
            }
          }, 'image/jpeg', 0.92)

        } catch (error) {
          addDebugLog(`Image processing error: ${error.message}`)
          reject(new Error(`Image processing failed: ${error.message}`))
        }
      }

      img.onerror = () => {
        addDebugLog('Failed to load image for processing')
        reject(new Error('Failed to load image for processing'))
      }

      // Load image from file
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = () => {
        addDebugLog('Failed to read image file')
        reject(new Error('Failed to read image file'))
      }
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

    addDebugLog(`Starting prediction for ${selectedImages.length} images`)
    addDebugLog(`Using language: ${language}`)

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
        addDebugLog(`Processing image ${i + 1}/${selectedImages.length}: ${image.name}`)

        // IMPROVED: Preprocessing with better error handling
        let processedBlob = null
        try {
          processedBlob = await preprocessImageForPrediction(image.file)
          addDebugLog(`Preprocessing successful: ${processedBlob.size} bytes`)
        } catch (preprocessError) {
          addDebugLog(`Preprocessing failed: ${preprocessError.message}`)
          throw new Error(`Preprocessing failed: ${preprocessError.message}`)
        }
        
        if (!processedBlob) {
          throw new Error('Preprocessing produced null blob')
        }
        
        // Create FormData untuk debugging
        const formData = new FormData()
        formData.append('image', processedBlob)
        formData.append('language', language)
        formData.append('mirror', 'false')
        
        addDebugLog(`Sending to API: ${language}, blob size: ${processedBlob.size}`)
        
        // Make prediction with processed blob - WITH RETRY
        let result = null
        let retryCount = 0
        const maxRetries = 2
        
        while (retryCount <= maxRetries) {
          try {
            result = await apiService.predictImage(processedBlob, language, false)
            addDebugLog(`API response: ${JSON.stringify(result)}`)
            break
          } catch (apiError) {
            retryCount++
            addDebugLog(`API call failed (attempt ${retryCount}): ${apiError.message}`)
            if (retryCount > maxRetries) throw apiError
            await new Promise(r => setTimeout(r, 1000)) // Wait 1s before retry
          }
        }

        // Safety check for result
        if (!result) {
          throw new Error('API returned null result')
        }
        
        const resultData = {
          imageId: image.id,
          imageName: image.name,
          imagePreview: image.preview,
          result: result,
          timestamp: new Date()
        }

        newResults.push(resultData)

        // Add to letter sequence if successful
        if (result.success && result.prediction && result.prediction !== "No hand detected") {
          addDebugLog(`Attempting to add "${result.prediction}" (confidence: ${result.confidence})`)
          const wasAdded = addLetterToSequence(result.prediction, result.confidence)
          addDebugLog(`Add result: ${wasAdded ? 'SUCCESS' : 'BLOCKED'}`)
          
          // Collect successful predictions for string
          if (wasAdded) {
            predictionLetters.push(result.prediction)
          }
        } else {
          addDebugLog(`Skip adding to sequence: success=${result.success}, prediction="${result.prediction}"`)
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

        addDebugLog(`Image ${i + 1} result: ${result.prediction} (${(result.confidence * 100).toFixed(1)}%)`)

        // Small delay between requests
        if (i < selectedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (err) {
        addDebugLog(`Error processing ${image.name}: ${err.message}`)
        
        const errorResult = {
          imageId: image.id,
          imageName: image.name,
          imagePreview: image.preview,
          result: { success: false, error: err.message },
          timestamp: new Date()
        }

        newResults.push(errorResult)

        // Update image status
        setSelectedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'error', error: err.message }
              : img
          )
        )
      }
    }

    setResults(newResults)
    
    // Build prediction string dari sequence
    if (letterSequence.length > 0) {
      const finalString = letterSequence.map(item => item.letter).join('')
      setPredictionString(finalString)
      addDebugLog(`Final prediction string: "${finalString}"`)
    } else {
      addDebugLog('No letters in sequence after processing')
    }
    
    setIsLoading(false)
    setProcessingIndex(-1)

    addDebugLog('Batch processing complete')
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
              className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Connection
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            Multiple Image Upload
          </h3>
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
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Upload Zone or Image Grid */}
        {selectedImages.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-700 mb-2">
              Drop your images here
            </h4>
            <p className="text-gray-500 mb-4">
              atau klik untuk memilih files
            </p>
            <p className="text-sm text-gray-400">
              Format: JPG, PNG, BMP • Max: 10MB per file • Up to 10 images total
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Menggunakan preprocessing yang sama dengan camera mode
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
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
                  Menggunakan preprocessing yang sama dengan camera mode
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
                    {image.status === 'ready' && '●'}
                    {image.status === 'completed' && '✓'}
                    {image.status === 'error' && '✗'}
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
              {selectedImages.length < 10 && (
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
                className="btn-primary flex items-center gap-2"
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
            />
          </div>
        )}
      </div>

      {/* Letter Sequence Display */}
      {letterSequence.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-green-900 flex items-center gap-2">
              Live Letter Sequence
              <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                {letterSequence.filter(item => !item.isSpace).length} letters
              </span>
            </h4>
            <div className="flex items-center gap-2">
              {sequenceHistory.length > 0 && (
                <button
                  onClick={undoLastLetter}
                  className="text-orange-500 hover:text-orange-700 p-1"
                  title="Undo last letter"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={clearSequence}
                className="text-red-500 hover:text-red-700 p-1"
                title="Clear sequence"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Letter Display */}
          <div className="text-center mb-4">
            <div className="flex justify-center items-center gap-3 flex-wrap mb-3">
              {letterSequence.map((item, index) => (
                <div
                  key={item.id}
                  className={`
                    relative
                    ${item.isSpace ? 'w-6 h-8 bg-gray-300' : 'w-14 h-14 bg-white border-2 border-green-300 shadow-lg'}
                    rounded-lg flex items-center justify-center
                    transition-all duration-300 hover:scale-105
                    ${item.source === 'upload' ? 'ring-2 ring-blue-400' : ''}
                  `}
                  title={item.isSpace ? 'Space' : `${item.letter} (${(item.confidence * 100).toFixed(0)}%) - ${item.source}`}
                >
                  {!item.isSpace && (
                    <>
                      <span className="text-3xl font-bold text-green-600">
                        {item.letter}
                      </span>
                      <span className="absolute -bottom-1 text-xs text-gray-500 bg-white px-1 rounded border">
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" title="Upload mode"></span>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Statistics */}
            <p className="text-green-700 text-sm mb-3">
              {letterSequence.filter(item => !item.isSpace).length} letters • {letterSequence.filter(item => item.isSpace).length} spaces
              • Confidence: {letterSequence.length > 0 ? 
                (letterSequence.filter(item => !item.isSpace).reduce((acc, item) => acc + item.confidence, 0) / 
                letterSequence.filter(item => !item.isSpace).length * 100).toFixed(0) : 0}% avg
            </p>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-2 flex-wrap mb-3">
              <button
                onClick={addSpaceToSequence}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
              >
                <Space className="w-4 h-4" />
                Add Space
              </button>
              <button
                onClick={copySequenceText}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                Copy Text
              </button>
            </div>
          </div>
          
          {/* Final Text Preview */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-gray-600 text-sm mb-2">Hasil Terjemahan:</p>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2 tracking-wider">
                {letterSequence.map(item => item.letter).join('')}
              </div>
              <p className="text-green-700 text-sm">
                {letterSequence.filter(item => !item.isSpace).length} huruf berhasil diterjemahkan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder message when no letters yet */}
      {letterSequence.length === 0 && selectedImages.length > 0 && backendStatus === 'connected' && (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-6 text-center">
          <div className="text-blue-400 mb-2">
            <Type className="w-8 h-8 mx-auto" />
          </div>
          <h4 className="font-medium text-blue-900 mb-2">Siap untuk Terjemahan</h4>
          <p className="text-blue-700 text-sm">
            Huruf akan muncul secara otomatis di sini setelah prediksi pertama
          </p>
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
      {backendStatus === 'connected' && selectedImages.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Petunjuk Penggunaan:</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• <strong>Auto Letter Display:</strong> Huruf akan muncul otomatis saat prediksi berhasil (min 10% confidence)</li>
            <li>• <strong>Multiple Upload:</strong> Tambahkan hingga 10 gambar untuk diproses sekaligus</li>
            <li>• <strong>Sequence Building:</strong> Huruf secara otomatis ditambahkan ke sequence</li>
            <li>• <strong>Optimal Results:</strong> Pastikan gambar dengan latar belakang yang kontras</li>
          </ul>
        </div>
      )}
      
      {/* Debug Log (hanya tampil saat ada error) */}
      {error && debugLog.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-700">Debug Log</h4>
            <button 
              onClick={() => setDebugLog([])}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono h-32 overflow-y-auto">
            {debugLog.map((log, i) => (
              <div key={i} className="mb-1">
                <span className="text-gray-500">[{log.time.split('T')[1].split('.')[0]}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload
