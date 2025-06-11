// Updated apiService.js for Railway Backend Connection
class ApiService {
  constructor() {
    // Railway backend URL (fixed)
    this.baseURL = import.meta.env.VITE_API_URL || 
                   import.meta.env.VITE_API_BASE_URL || 
                   'https://silenbek-production.up.railway.app'

    this.timeout = 45000 // Increased timeout for Railway cold starts
    
    console.log('🚀 ApiService initialized for Railway backend')
    console.log('📡 Railway Backend URL:', this.baseURL)
    console.log('🌍 Environment:', import.meta.env.MODE)
    console.log('🏠 Frontend URL:', window.location.origin)
    
    // Test connection immediately
    this.testConnectionOnInit()
  }

  async testConnectionOnInit() {
    try {
      console.log('🧪 Testing Railway connection...')
      const health = await this.healthCheck()
      console.log('✅ Railway backend connected:', health)
      
      if (health.models_summary) {
        const modelCount = Object.keys(health.models_summary).length
        console.log(`🤖 ${modelCount} models available on Railway:`, Object.keys(health.models_summary))
      }
    } catch (error) {
      console.error('❌ Railway connection failed:', error)
      console.warn('🔧 Railway troubleshooting:')
      console.warn('1. Railway service might be sleeping (first request takes 30-60s)')
      console.warn('2. Check if Railway deployment is successful')
      console.warn('3. Verify CORS configuration allows Vercel domain')
      console.warn('4. Backend URL:', this.baseURL)
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      timeout: this.timeout,
      ...options,
      headers: {
        'User-Agent': 'SILENT-Frontend-Vercel/2.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin, // Dynamic origin
        ...options.headers,
      },
    }

    console.log('📤 Making request to Railway:', {
      url,
      method: config.method || 'GET',
      hasBody: !!config.body,
      origin: config.headers.Origin
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
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }))
        console.error('❌ Railway request failed:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Railway response data received')
      return data
    } catch (error) {
      console.error('💥 Railway request error:', error)
      
      if (error.name === 'AbortError') {
        throw new Error('Railway timeout - Service might be starting up, please wait and try again')
      }
      
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Network error - Cannot connect to Railway backend. Check your internet connection.`)
      }

      if (error.message.includes('CORS')) {
        throw new Error('CORS error - Railway backend CORS configuration issue')
      }
      
      throw error
    }
  }

  async healthCheck() {
    console.log('🏥 Checking Railway backend health...')
    const response = await this.request('/api/health')
    console.log('💚 Railway health check result:', response.status)
    return response
  }

  async getModelInfo() {
    console.log('🤖 Getting Railway model info...')
    const response = await this.request('/api/models')
    console.log('📊 Railway models:', response.total_models || 0)
    return response
  }

  // Check if backend is available (for UI status)
  async isBackendAvailable() {
    try {
      await this.healthCheck()
      return true
    } catch (error) {
      console.warn('Railway backend not available:', error.message)
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
      console.log('✅ Base64 ready for Railway backend')

      console.log('📡 Sending to Railway backend...')
      const requestData = {
        image: base64Image,
        language_type: language,
        mirror_mode: mirrorMode
      }
      
      console.log('📤 Railway request payload size:', {
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

      console.log('🎉 Railway prediction response:', {
        success: response.success,
        prediction: response.prediction,
        confidence: response.confidence,
        dataset: response.dataset
      })
      
      return response
    } catch (error) {
      console.error('💥 Railway prediction failed:', error)
      
      // Enhanced error handling for Railway
      if (error.message.includes('timeout')) {
        throw new Error('Railway backend timeout - Service might be sleeping. Please try again in a moment.')
      } else if (error.message.includes('Network error')) {
        throw new Error('Cannot connect to Railway backend. Please check your internet connection.')
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error - Railway backend configuration issue.')
      } else if (error.message.includes('500')) {
        throw new Error('Railway backend internal error - The prediction service encountered an error.')
      } else if (error.message.includes('404')) {
        throw new Error('Railway endpoint not found - Backend deployment issue.')
      } else if (error.message.includes('413')) {
        throw new Error('Image too large for Railway backend - Please use a smaller image.')
      }
      
      throw error
    }
  }

  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp']
    const maxSize = 10 * 1024 * 1024 // 10MB for Railway

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
      const error = 'File too large. Maximum size is 10MB for Railway backend.'
      console.error('❌ Validation failed:', error)
      throw new Error(error)
    }

    console.log('✅ File validation passed')
    return true
  }

  async debugFullFlow() {
    console.log('🔧 === RAILWAY FULL DEBUG FLOW ===')
    
    try {
      // 1. Health check
      console.log('Testing Railway health...')
      const health = await this.healthCheck()
      
      // 2. Model info
      console.log('Testing Railway models...')
      const models = await this.getModelInfo()
      
      // 3. Test prediction with Railway
      console.log('Testing Railway prediction...')
      
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
        
        console.log('Railway test prediction result:', testResult)
        
        // Validate response format
        const hasValidFields = testResult.success !== undefined && 
                               testResult.prediction !== undefined &&
                               testResult.confidence !== undefined
        console.log(`Response validation: ${hasValidFields ? 'VALID' : 'INVALID'}`)
        
      } catch (predError) {
        console.error('Railway test prediction failed:', predError)
      }
      
      console.log('Railway backend tests completed')
      
      return {
        health,
        models,
        status: 'railway_debug_complete',
        backend_url: this.baseURL,
        frontend_url: window.location.origin
      }
      
    } catch (error) {
      console.error('Railway debug flow failed:', error)
      throw error
    }
  }
}

// Export Railway-configured API service
export const apiService = new ApiService()
export default ApiService

// Add global debug function for testing Railway connection
window.debugRailwayAPI = () => {
  return apiService.debugFullFlow()
}

console.log('Railway API Service loaded for Vercel deployment')
console.log('Test connection: window.debugRailwayAPI()')
console.log('Frontend URL:', window.location.origin)
console.log('Backend URL: https://silenbek-production.up.railway.app')
