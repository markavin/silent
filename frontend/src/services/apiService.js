// Updated apiService.js for Railway Backend Connection
class ApiService {
  constructor() {
    // Priority: Environment variable > Vite config > Hardcoded Railway URL
    this.baseURL = import.meta.env.VITE_API_URL || 
                   import.meta.env.VITE_API_BASE_URL || 
                   'https://silenbek-production.up.railway.app'

    this.timeout = 30000
    
    console.log('🚀 ApiService initialized for Railway backend')
    console.log('📡 Backend URL:', this.baseURL)
    console.log('🌍 Environment:', import.meta.env.MODE)
    
    // Test connection immediately
    this.testConnectionOnInit()
  }

  async testConnectionOnInit() {
    try {
      console.log('🧪 Testing initial Railway connection...')
      const health = await this.healthCheck()
      console.log('✅ Railway backend connected:', health)
      
      const models = await this.getModelInfo()
      console.log('🤖 Model status:', models)
    } catch (error) {
      console.error('❌ Railway connection failed:', error)
      console.warn('🔧 Troubleshooting tips:')
      console.warn('1. Check if Railway backend is deployed and running')
      console.warn('2. Verify Railway URL:', this.baseURL)
      console.warn('3. Check CORS configuration in backend')
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      timeout: this.timeout,
      ...options,
      headers: {
        'User-Agent': 'SILENT-Frontend-Vercel/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://silentdicoding.vercel.app', // Add explicit origin
        ...options.headers,
      },
    }

    console.log('📤 Making request to Railway:', {
      url,
      method: config.method || 'GET',
      hasBody: !!config.body,
      headers: config.headers
    })

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('📥 Railway response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }))
        console.error('❌ Railway request failed:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Railway response data:', data)
      return data
    } catch (error) {
      console.error('💥 Railway request error:', error)
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Railway backend may be sleeping or overloaded')
      }
      
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Network error - Cannot connect to Railway backend at ${this.baseURL}`)
      }

      if (error.message.includes('CORS')) {
        throw new Error('CORS error - Backend needs to allow requests from Vercel domain')
      }
      
      throw error
    }
  }

  async healthCheck() {
    console.log('🏥 Checking Railway backend health...')
    const response = await this.request('/api/health')
    console.log('💚 Railway health check result:', response)
    return response
  }

  async getModelInfo() {
    console.log('🤖 Getting Railway model info...')
    const response = await this.request('/api/models')
    console.log('📊 Railway model info:', response)
    return response
  }

  // Check if backend is available (for UI status)
  async isBackendAvailable() {
    try {
      await this.healthCheck()
      return true
    } catch (error) {
      console.warn('Backend not available:', error.message)
      return false
    }
  }

  // Get API status for debugging
  async getApiStatus() {
    return await this.healthCheck()
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      console.log('🖼️ Converting file to base64:', {
        name: file.name,
        type: file.type,
        size: file.size
      })
      
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
        console.log('✅ Base64 conversion complete, length:', base64Data.length)
        resolve(base64Data)
      }
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error)
        reject(error)
      }
      reader.readAsDataURL(file)
    })
  }

  async predictImage(imageInput, language = 'bisindo', mirrorMode = null) {
    try {
      console.log('🔮 Starting Railway prediction...')
      console.log('📋 Input params:', { hasImage: !!imageInput, language, mirrorMode })
      
      let imageFile = null
      
      if (imageInput instanceof FormData) {
        imageFile = imageInput.get('image')
        const formLanguage = imageInput.get('dataset_type') || imageInput.get('language_type')
        if (formLanguage) language = formLanguage
        console.log('📦 Extracted from FormData:', { hasImageFile: !!imageFile, language })
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        imageFile = imageInput
        console.log('📁 Direct file input:', { type: imageFile.type, size: imageFile.size })
      } else {
        throw new Error('Invalid image input type')
      }

      if (!imageFile) {
        throw new Error('No image file found in input')
      }

      this.validateImageFile(imageFile)

      console.log('🔄 Converting to base64 for Railway...')
      const base64Image = await this.fileToBase64(imageFile)
      console.log('✅ Base64 ready for Railway')

      console.log('📡 Sending to Railway backend...')
      const requestData = {
        image: base64Image,
        language_type: language,
        mirror_mode: mirrorMode // Add mirror mode support
      }
      
      console.log('📤 Railway request payload:', {
        has_image: !!requestData.image,
        image_length: requestData.image?.length,
        language_type: requestData.language_type,
        mirror_mode: requestData.mirror_mode
      })

      const response = await this.request('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      console.log('🎉 Railway prediction response:', response)
      return response
    } catch (error) {
      console.error('💥 Railway prediction failed:', error)
      
      // Enhanced error handling for Railway
      if (error.message.includes('timeout')) {
        throw new Error('Railway backend is taking too long to respond. The service might be sleeping - please try again.')
      } else if (error.message.includes('Network error')) {
        throw new Error('Cannot connect to Railway backend. Please check your internet connection.')
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error: Railway backend needs to be configured to accept requests from Vercel.')
      } else if (error.message.includes('500')) {
        throw new Error('Railway backend error: The prediction service encountered an internal error.')
      } else if (error.message.includes('404')) {
        throw new Error('Railway backend endpoint not found. Please check the backend deployment.')
      }
      
      throw error
    }
  }

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

  async debugFullFlow() {
    console.log('🔧 === RAILWAY DEBUG FLOW ===')
    
    try {
      // 1. Health check
      console.log('1️⃣ Testing Railway health check...')
      const health = await this.healthCheck()
      
      // 2. Model info
      console.log('2️⃣ Testing Railway model info...')
      const models = await this.getModelInfo()
      
      // 3. Test prediction with small image
      console.log('3️⃣ Testing Railway prediction...')
      
      // Create a simple test image (1x1 pixel PNG)
      const testImageB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      
      try {
        const testResult = await this.request('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: testImageB64,
            language_type: 'bisindo',
            mirror_mode: true
          })
        })
        
        console.log('✅ Railway test prediction result:', testResult)
        
        // Validate response format
        const hasValidFields = testResult.success !== undefined && 
                               testResult.prediction !== undefined &&
                               testResult.confidence !== undefined
        console.log(`📝 Response validation: ${hasValidFields ? 'VALID' : 'INVALID'}`)
        
      } catch (predError) {
        console.error('❌ Railway test prediction failed:', predError)
      }
      
      console.log('4️⃣ Railway backend tests completed')
      
      return {
        health,
        models,
        status: 'railway_debug_complete',
        backend_url: this.baseURL
      }
      
    } catch (error) {
      console.error('💥 Railway debug flow failed:', error)
      throw error
    }
  }
}

// Export Railway-configured API service
export const apiService = new ApiService()
export default ApiService

// Add global debug function for testing
window.debugRailwayAPI = () => {
  return apiService.debugFullFlow()
}

console.log('🚀 Railway API Service loaded - run window.debugRailwayAPI() to test connection')
