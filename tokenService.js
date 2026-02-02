const axios = require('axios');

/**
 * PLM Token Service
 * Infor CloudSuite OAuth2.0 Token Management
 * Environment: TEST (ATJZAMEWEF5P4SNV_TST)
 */

class TokenService {
  constructor() {
    // Token cache
    this.accessToken = null;
    this.tokenExpiry = null;
    this.tokenType = null;

    // Configuration from BackendServisi.ionapi
    this.config = {
      tenantId: 'ATJZAMEWEF5P4SNV_TST',
      clientName: 'BackendServisi',
      clientId: 'ATJZAMEWEF5P4SNV_TST~vlWkwz2P74KAmRFfihVsdK5yjnHvnfPUrcOt4nl6gkI',
      clientSecret: 'HU1TUcBOX1rkp-uuYKUQ3simFEYzPKNM-XIyf4ewIxe-TYUZOK7RAlXUPd_FwSZMAslt8I9RZmv23xItVKY8EQ',
      serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_TST#g2AkIdNc1h68LWFR5bW16K1GqPN1fNcANBxCSWt7o5HkeHtEHaj5nt8jkp93B7Pz-FlipOUm_MjUPuR-4SehRA',
      serviceAccountSecretKey: 'dPomgd9MprgndvOBxBULqFGIjyKzGtOM6nQHF8jNSH-L5rvrzn9rTbEo_kIPBIYwxQfizkkQW0HAHKDHoR5CSQ',
      ionApiUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
      providerUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_TST/as/',
      endpoints: {
        authorization: 'authorization.oauth2',
        token: 'token.oauth2',
        revoke: 'revoke_token.oauth2'
      }
    };

    console.log('🔧 Token Service initialized for:', this.config.tenantId);
  }

  /**
   * Get access token (from cache or fetch new one)
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Check if token exists and is still valid
    if (this.accessToken && this.isTokenValid()) {
      console.log('✅ Using cached access token');
      return this.accessToken;
    }

    console.log('🔄 Fetching new access token...');
    return await this.fetchNewToken();
  }

  /**
   * Check if current token is still valid
   * @returns {boolean}
   */
  isTokenValid() {
    if (!this.tokenExpiry) {
      return false;
    }

    // Check if token expires in less than 5 minutes (buffer time)
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();
    
    return currentTime < (this.tokenExpiry - bufferTime);
  }

  /**
   * Fetch new access token from OAuth2.0 provider
   * @returns {Promise<string>} Access token
   */
  async fetchNewToken() {
    try {
      const tokenUrl = `${this.config.providerUrl}${this.config.endpoints.token}`;
      
      // OAuth2.0 Password Grant Type (Resource Owner Password Credentials)
      // Infor ION API uses service account keys as username/password
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', this.config.serviceAccountAccessKey);
      params.append('password', this.config.serviceAccountSecretKey);
      
      const auth = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString('base64');

      console.log('🔐 Token Request URL:', tokenUrl);
      console.log('🔐 Client ID:', this.config.clientId);
      
      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenType = response.data.token_type || 'Bearer';
        
        // Calculate token expiry time
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        this.tokenExpiry = Date.now() + (expiresIn * 1000);

        const expiryDate = new Date(this.tokenExpiry);
        console.log('✅ Access token acquired successfully');
        console.log(`⏰ Token expires at: ${expiryDate.toISOString()}`);
        console.log(`📝 Token type: ${this.tokenType}`);
        console.log(`⏱️  Expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 60)} minutes)`);

        return this.accessToken;
      } else {
        throw new Error('Invalid token response: access_token not found');
      }

    } catch (error) {
      console.error('❌ Error fetching access token:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(`Failed to acquire access token: ${error.message}`);
    }
  }

  /**
   * Get full authorization header value
   * @returns {Promise<string>} Authorization header value (e.g., "Bearer token...")
   */
  async getAuthorizationHeader() {
    const token = await this.getAccessToken();
    return `${this.tokenType} ${token}`;
  }

  /**
   * Revoke current access token
   * @returns {Promise<void>}
   */
  async revokeToken() {
    if (!this.accessToken) {
      console.log('ℹ️  No token to revoke');
      return;
    }

    try {
      const revokeUrl = `${this.config.providerUrl}${this.config.endpoints.revoke}`;
      
      const params = new URLSearchParams();
      params.append('token', this.accessToken);
      
      const auth = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString('base64');

      await axios.post(revokeUrl, params, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Token revoked successfully');
      
      // Clear cached token
      this.accessToken = null;
      this.tokenExpiry = null;
      this.tokenType = null;

    } catch (error) {
      console.error('❌ Error revoking token:', error.message);
      throw new Error(`Failed to revoke token: ${error.message}`);
    }
  }

  /**
   * Force refresh token (revoke current and fetch new)
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    console.log('🔄 Forcing token refresh...');
    
    // Revoke current token if exists
    if (this.accessToken) {
      try {
        await this.revokeToken();
      } catch (error) {
        console.warn('⚠️  Failed to revoke old token, continuing with new token fetch');
      }
    }
    
    // Clear cache
    this.accessToken = null;
    this.tokenExpiry = null;
    this.tokenType = null;
    
    // Fetch new token
    return await this.getAccessToken();
  }

  /**
   * Get token information
   * @returns {Object} Token info
   */
  getTokenInfo() {
    const info = {
      environment: 'TEST',
      tenantId: this.config.tenantId,
      clientName: this.config.clientName,
      hasToken: !!this.accessToken,
      isValid: this.isTokenValid(),
      expiryTime: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      tokenType: this.tokenType
    };

    if (this.tokenExpiry) {
      const remainingSeconds = Math.floor((this.tokenExpiry - Date.now()) / 1000);
      info.remainingTime = {
        seconds: remainingSeconds,
        minutes: Math.floor(remainingSeconds / 60),
        hours: Math.floor(remainingSeconds / 3600)
      };
    }

    return info;
  }

  /**
   * Get configuration info (without secrets)
   * @returns {Object} Config info
   */
  getConfigInfo() {
    return {
      environment: 'TEST',
      tenantId: this.config.tenantId,
      clientName: this.config.clientName,
      ionApiUrl: this.config.ionApiUrl,
      providerUrl: this.config.providerUrl,
      endpoints: this.config.endpoints
    };
  }
}

// Create singleton instance
const tokenService = new TokenService();

module.exports = tokenService;
