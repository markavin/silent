// apiService.js - Fixed API service with proper image preprocessing

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = 30000
  }

  async makeRequest(url, options = {}) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server took too long to respond')
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - unable to connect to server')
      }
      
      throw error
    }
  }

  async isBackendAvailable() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        },
      })
      return response.ok
    } catch (error) {
      console.error('Backend availability check failed:', error)
      return false
    }
  }

  async getApiStatus() {
    return this.makeRequest(`${this.baseURL}/api/health`)
  }

  async getModelInfo(language = 'bisindo') {
    const response = await this.makeRequest(`${this.baseURL}/api/models`)
    
    if (response.models_detail && response.models_detail[language.toUpperCase()]) {
      return response.models_detail[language.toUpperCase()]
    }
    
    return {
      accuracy: 0.85,
      model_type: 'CNN + SVM Hybrid',
      classes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
      training_samples: 1000,
      test_samples: 200,
      timestamp: new Date().toISOString()
    }
  }

  prepareImageForPrediction(imageBlob, mirrorMode = null) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Set canvas size - maintain aspect ratio
          const maxSize = 1280
          let { width, height } = img
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height

          // Clear canvas
          ctx.clearRect(0, 0, width, height)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Apply mirror if needed (for webcam captures)
          if (mirrorMode === true) {
            ctx.save()
            ctx.scale(-1, 1)
            ctx.drawImage(img, -width, 0, width, height)
            ctx.restore()
          } else {
            ctx.drawImage(img, 0, 0, width, height)
          }

          // Apply contrast enhancement like camera_test.py
          const imageData = ctx.getImageData(0, 0, width, height)
          const data = imageData.data
          
          for (let i = 0; i < data.length; i += 4) {
            // Apply slight contrast enhancement
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.1 + 128))
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.1 + 128))
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.1 + 128))
          }
          
          ctx.putImageData(imageData, 0, 0)

          // Convert to base64
          const dataURL = canvas.toDataURL('image/jpeg', 0.92)
          resolve(dataURL)
        } catch (error) {
          reject(new Error(`Image processing failed: ${error.message}`))
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image for processing'))
      }

      // Handle different input types
      if (imageBlob instanceof Blob) {
        const reader = new FileReader()
        reader.onload = (e) => {
          img.src = e.target.result
        }
        reader.onerror = () => reject(new Error('Failed to read image blob'))
        reader.readAsDataURL(imageBlob)
      } else if (typeof imageBlob === 'string') {
        img.src = imageBlob
      } else if (imageBlob instanceof File) {
        const reader = new FileReader()
        reader.onload = (e) => {
          img.src = e.target.result
        }
        reader.onerror = () => reject(new Error('Failed to read image file'))
        reader.readAsDataURL(imageBlob)
      } else {
        reject(new Error('Invalid image input type'))
      }
    })
  }

  async predictImage(imageInput, language = 'bisindo', mirrorMode = null) {
    try {
      console.log('Starting prediction process...')
      console.log('Language:', language)
      console.log('Mirror mode:', mirrorMode)

      // Process the image
      let processedImageData
      
      if (imageInput instanceof FormData) {
        // Handle FormData (from file upload)
        const imageFile = imageInput.get('image')
        if (!imageFile) {
          throw new Error('No image found in FormData')
        }
        processedImageData = await this.prepareImageForPrediction(imageFile, mirrorMode)
      } else {
        // Handle Blob, File, or string
        processedImageData = await this.prepareImageForPrediction(imageInput, mirrorMode)
      }

      console.log('Image processed successfully')

      // Prepare request payload
      const payload = {
        image: processedImageData,
        language_type: language.toLowerCase(),
        mirror_mode: mirrorMode
      }

      console.log('Sending prediction request...')

      // Make API call
      const result = await this.makeRequest(`${this.baseURL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      console.log('Prediction response:', result)

      // Validate response
      if (!result) {
        throw new Error('Empty response from server')
      }

      // Return standardized format
      return {
        success: result.success || false,
        prediction: result.prediction || 'Unknown',
        confidence: result.confidence || 0.0,
        dataset: result.dataset || language.toUpperCase(),
        language_type: result.language_type || language,
        message: result.message || 'Prediction completed',
        timestamp: result.timestamp || new Date().toISOString(),
        error: result.error || null
      }

    } catch (error) {
      console.error('Prediction error:', error)
      
      return {
        success: false,
        prediction: 'Error',
        confidence: 0.0,
        dataset: language.toUpperCase(),
        language_type: language,
        message: 'Prediction failed',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }

  async predictBatch(imageFiles, language = 'bisindo', mirrorMode = null) {
    try {
      const results = []
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        console.log(`Processing image ${i + 1}/${imageFiles.length}: ${file.name}`)
        
        try {
          const result = await this.predictImage(file, language, mirrorMode)
          results.push({
            ...result,
            fileName: file.name,
            fileIndex: i
          })
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error)
          results.push({
            success: false,
            prediction: 'Error',
            confidence: 0.0,
            dataset: language.toUpperCase(),
            language_type: language,
            message: 'Processing failed',
            timestamp: new Date().toISOString(),
            error: error.message,
            fileName: file.name,
            fileIndex: i
          })
        }
        
        // Small delay between requests to avoid overwhelming server
        if (i < imageFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      return {
        success: true,
        results: results,
        totalProcessed: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('Batch prediction error:', error)
      return {
        success: false,
        error: error.message,
        results: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: imageFiles.length,
        timestamp: new Date().toISOString()
      }
    }
  }

  async loadModel(language) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/load_model/${language}`, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Load model error:', error)
      throw error
    }
  }

  getAvailableLanguages() {
    return [
      { code: 'bisindo', name: 'BISINDO', fullName: 'Bahasa Isyarat Indonesia' },
      { code: 'sibi', name: 'SIBI', fullName: 'Sistem Isyarat Bahasa Indonesia' }
    ]
  }
}

export const apiService = new APIService()
export default apiService
