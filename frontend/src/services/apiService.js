// FIXED apiService.js - API Service for SILENT frontend
class FixedApiService {
  constructor() {
    // Get API URL from environment variables or use default
    this.baseURL = import.meta.env.VITE_API_URL || 'https://silenbek-production.up.railway.app'
    this.timeout = 30000 // 30 seconds timeout
    
    console.log(' FixedApiService initialized with baseURL:', this.baseURL)
  }

  // Generic request method dengan detailed logging
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      timeout: this.timeout,
      ...options,
      headers: {
        ...options.headers,
      },
    }

    console.log('📡 Making request to:', url)
    console.log('⚙️ Request config:', config)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('📨 Response status:', response.status)
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Request failed:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      return data
    } catch (error) {
      console.error('Request error:', error)
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Please try again')
      }
      
      // Network error
      if (error.message.includes('fetch')) {
        throw new Error('Network error - Please check your connection and ensure the backend server is running')
      }
      
      throw error
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
    })
  }

  // POST request with JSON data
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  // Convert File/Blob to base64 string dengan logging
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      console.log('Converting file to base64:', {
        name: file.name,
        type: file.type,
        size: file.size
      })
      
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result
        // Remove data URL prefix to get pure base64
        const base64Data = base64.split(',')[1]
        console.log('Base64 conversion complete, length:', base64Data.length)
        resolve(base64Data)
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        reject(error)
      }
      reader.readAsDataURL(file)
    })
  }

  // Health check endpoint
  async healthCheck() {
    try {
      console.log('Performing health check...')
      const response = await this.get('/api/health')
      console.log('Health check successful:', response)
      return response
    } catch (error) {
      console.error('Health check failed:', error)
      throw new Error(`Health check failed: ${error.message}`)
    }
  }

  // FIXED: Predict image endpoint - simplified and robust
  async predictImage(imageInput, language = 'bisindo') {
    try {
      console.log('ApiService: Starting prediction...')
      console.log('Input params:', { hasImage: !!imageInput, language })
      
      let imageFile = null
      
      // Handle different input types
      if (imageInput instanceof FormData) {
        // Extract from FormData
        imageFile = imageInput.get('image')
        const formLanguage = imageInput.get('dataset_type')
        if (formLanguage) language = formLanguage
        console.log('Extracted from FormData:', { hasImageFile: !!imageFile, language })
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        // Direct file/blob
        imageFile = imageInput
        console.log('Direct file input:', { type: imageFile.type, size: imageFile.size })
      } else {
        throw new Error('Invalid image input type. Expected FormData, File, or Blob.')
      }

      if (!imageFile) {
        throw new Error('No image file found in input')
      }

      // Validate image file
      this.validateImageFile(imageFile)

      // Convert image to base64 (what backend expects)
      console.log('Converting to base64...')
      const base64Image = await this.fileToBase64(imageFile)
      console.log('Base64 conversion complete')

      // Send to backend endpoint
      console.log('Sending to backend...')
      const response = await this.post('/api/translate', {
        image: base64Image,
        language_type: language
      })

      console.log('Prediction response:', response)
      return response
    } catch (error) {
      console.error('Prediction failed:', error)
      throw new Error(`Prediction failed: ${error.message}`)
    }
  }

  // Batch prediction endpoint
  async predictBatch(formData) {
    try {
      console.log('Starting batch prediction...')
      
      const imageFiles = formData.getAll('images')
      const language = formData.get('dataset_type') || 'bisindo'

      console.log('Batch params:', { fileCount: imageFiles.length, language })

      if (!imageFiles || imageFiles.length === 0) {
        throw new Error('No image files provided')
      }

      const results = []
      
      // Process each image individually since backend doesn't have batch endpoint
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i]
        console.log(`Processing image ${i+1}/${imageFiles.length}: ${imageFile.name}`)
        
        try {
          const response = await this.predictImage(imageFile, language)
          
          results.push({
            ...response,
            imageIndex: i,
            imageName: imageFile.name,
            success: response.success !== false
          })
          
          console.log(`Image ${i+1} processed successfully`)
        } catch (error) {
          console.error(`Image ${i+1} failed:`, error)
          results.push({
            success: false,
            error: error.message,
            imageIndex: i,
            imageName: imageFile.name
          })
        }
        
        // Small delay between requests to avoid overwhelming backend
        if (i < imageFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      const successfulResults = results.filter(r => r.success)
      console.log(`Batch complete: ${successfulResults.length}/${results.length} successful`)

      return {
        success: true,
        results: results,
        total: results.length,
        successful: successfulResults.length
      }
    } catch (error) {
      console.error('Batch prediction failed:', error)
      throw new Error(`Batch prediction failed: ${error.message}`)
    }
  }

  // Get model information
  async getModelInfo() {
    try {
      console.log('Getting model info...')
      const response = await this.get('/api/models')
      console.log('Model info retrieved:', response)
      return response
    } catch (error) {
      console.error('❌ Failed to get model info:', error)
      throw new Error(`Failed to get model info: ${error.message}`)
    }
  }

  // Test API connection
  async testConnection() {
    try {
      console.log('🧪 Testing API connection...')
      const response = await this.get('/api/test')
      console.log('✅ Connection test successful:', response)
      return {
        success: true,
        message: 'API connection successful',
        data: response
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      return {
        success: false,
        message: error.message,
        error: error
      }
    }
  }

  // Get API status and information
  async getApiStatus() {
    try {
      console.log('📊 Getting API status...')
      
      const [healthResponse, modelsResponse] = await Promise.all([
        this.healthCheck().catch(err => ({ error: err.message })),
        this.getModelInfo().catch(err => ({ error: err.message }))
      ])

      const status = {
        health: healthResponse,
        models: modelsResponse,
        timestamp: new Date().toISOString()
      }
      
      console.log('✅ API status retrieved:', status)
      return status
    } catch (error) {
      console.error('❌ Failed to get API status:', error)
      throw new Error(`Failed to get API status: ${error.message}`)
    }
  }

  // Utility method to check if backend is available
  async isBackendAvailable() {
    try {
      console.log('🔍 Checking backend availability...')
      await this.healthCheck()
      console.log('✅ Backend is available')
      return true
    } catch (error) {
      console.warn('⚠️ Backend not available:', error.message)
      return false
    }
  }

  // Create FormData for image prediction (compatibility with existing code)
  createPredictionFormData(imageFile, language) {
    console.log('📋 Creating FormData for prediction:', { 
      fileName: imageFile.name, 
      fileSize: imageFile.size, 
      language 
    })
    
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('dataset_type', language)
    return formData
  }

  // Create FormData for batch prediction (compatibility with existing code)
  createBatchPredictionFormData(imageFiles, language) {
    console.log('📦 Creating FormData for batch prediction:', { 
      fileCount: imageFiles.length, 
      language 
    })
    
    const formData = new FormData()
    
    imageFiles.forEach((file, index) => {
      formData.append('images', file)
      console.log(`📎 Added file ${index + 1}: ${file.name}`)
    })
    
    formData.append('dataset_type', language)
    return formData
  }

  // Helper method to validate image file
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']
    const maxSize = 16 * 1024 * 1024 // 16MB

    console.log('🔍 Validating image file:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    if (!allowedTypes.includes(file.type)) {
      const error = 'Invalid file type. Please use JPEG, PNG, or BMP images.'
      console.error('❌ Validation failed:', error)
      throw new Error(error)
    }

    if (file.size > maxSize) {
      const error = 'File too large. Maximum size is 16MB.'
      console.error('❌ Validation failed:', error)
      throw new Error(error)
    }

    console.log('✅ File validation passed')
    return true
  }

  // Predict with file validation (simplified wrapper)
  async predictImageWithValidation(imageFile, language) {
    console.log('🧪 Predicting with validation...')
    
    // Validate file
    this.validateImageFile(imageFile)
    
    // Make prediction directly
    return this.predictImage(imageFile, language)
  }

  // Get base URL for external use
  getBaseURL() {
    return this.baseURL
  }

  // Set base URL (useful for testing or switching environments)
  setBaseURL(url) {
    console.log('🔧 Changing base URL from', this.baseURL, 'to', url)
    this.baseURL = url
  }

  // Debug method to test with a simple request
  async debugTest() {
    try {
      console.log('🐛 Running debug test...')
      
      // Test 1: Health check
      console.log('🏥 Test 1: Health check')
      const health = await this.healthCheck()
      
      // Test 2: Models info
      console.log('🤖 Test 2: Models info')
      const models = await this.getModelInfo()
      
      // Test 3: Connection test
      console.log('🧪 Test 3: Connection test')
      const connection = await this.testConnection()
      
      const results = {
        health: { success: true, data: health },
        models: { success: true, data: models },
        connection: { success: true, data: connection }
      }
      
      console.log('🎉 Debug test completed:', results)
      return results
      
    } catch (error) {
      console.error('❌ Debug test failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Create and export singleton instance
export const apiService = new FixedApiService()

// Export the class for testing or custom instances
export default FixedApiService

// Auto-test on load (only in development)
if (import.meta.env.DEV) {
  console.log('🚀 SILENT Frontend API Service loaded')
  console.log('🔧 Debug mode detected - running connection test...')
  
  // Test connection after a short delay
  setTimeout(async () => {
    try {
      const isAvailable = await apiService.isBackendAvailable()
      if (isAvailable) {
        console.log('✅ Backend connection verified')
      } else {
        console.warn('⚠️ Backend not available - make sure to start the Python backend')
      }
    } catch (error) {
      console.warn('⚠️ Backend connection test failed:', error.message)
    }
  }, 1000)
}
