/**
 * PLM Service
 * Handles StyleCode generation and PLM API interactions
 */

const axios = require('axios');
const tokenService = require('./tokenService');

class PLMService {
  constructor() {
    this.baseUrl = 'https://mingle-ionapi.eu1.inforcloudsuite.com/ATJZAMEWEF5P4SNV_TST/FASHIONPLM/odata2/api/odata2';
  }

  /**
   * Get style details by StyleId
   * @param {number} styleId - Style ID
   * @returns {Promise<Object>} Style details
   */
  async getStyleDetails(styleId) {
    const authHeader = await tokenService.getAuthorizationHeader();
    
    const url = `${this.baseUrl}/STYLE`;
    const params = {
      $select: 'StyleId,StyleCode,PatternSpecNumber',
      $expand: 'ProductSubSubCategory($select=Id,Code,Name),Season($select=Id,Code,Name),Brand($select=Id,Code,Name)',
      $filter: `StyleId eq ${styleId} and IsDeleted eq 0`
    };

    console.log(`🔍 Fetching style details for StyleId: ${styleId}`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      params
    });

    if (!response.data || !response.data.value || response.data.value.length === 0) {
      throw new Error(`Style not found: ${styleId}`);
    }

    const style = response.data.value[0];

    // Validate required fields
    if (!style.Brand || !style.Season || !style.ProductSubSubCategory) {
      throw new Error(`Missing required fields for StyleId ${styleId}: Brand, Season, or ProductSubSubCategory is empty`);
    }

    console.log(`✅ Style details retrieved:`);
    console.log(`   Brand: ${style.Brand.Code} - ${style.Brand.Name}`);
    console.log(`   Season: ${style.Season.Code} - ${style.Season.Name}`);
    console.log(`   SubSubCategory: ${style.ProductSubSubCategory.Code} - ${style.ProductSubSubCategory.Name}`);
    console.log(`   Current StyleCode: ${style.StyleCode || 'N/A'}`);

    return style;
  }

  /**
   * Get all styles with same Season and ProductSubSubCategory
   * @param {number} seasonId - Season ID
   * @param {number} productSubSubCategoryId - Product Sub Sub Category ID
   * @returns {Promise<Array>} List of styles
   */
  async getSimilarStyles(seasonId, productSubSubCategoryId) {
    const authHeader = await tokenService.getAuthorizationHeader();
    
    const url = `${this.baseUrl}/STYLE`;
    const params = {
      $select: 'StyleId,StyleCode',
      $filter: `SeasonId eq ${seasonId} and ProductSubSubCategoryId eq ${productSubSubCategoryId} and IsDeleted eq 0`
    };

    console.log(`🔍 Fetching similar styles:`);
    console.log(`   SeasonId: ${seasonId}`);
    console.log(`   ProductSubSubCategoryId: ${productSubSubCategoryId}`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      params
    });

    const styles = response.data.value || [];
    console.log(`✅ Found ${styles.length} similar styles`);

    return styles;
  }

  /**
   * Generate StyleCode based on business rules
   * Format: {Brand.Code[0]}{Season.Name[0:4]}0{ProductSubSubCategory.Code[0:3]}{SequenceNumber}
   * @param {Object} style - Style object
   * @param {Array} similarStyles - Similar styles to determine next sequence
   * @returns {Object} Generated StyleCode and PatternSpecNumber, or null if update not needed
   */
  generateStyleCode(style, similarStyles) {
    const brandChar = style.Brand.Code.charAt(0).toUpperCase();
    const seasonCode = style.Season.Name.substring(0, 4).toUpperCase();
    const categoryCode = style.ProductSubSubCategory.Code.substring(0, 3);
    const fixedZero = '0';

    console.log(`\n🔢 Generating StyleCode:`);
    console.log(`   Brand char: ${brandChar}`);
    console.log(`   Season code: ${seasonCode}`);
    console.log(`   Category code: ${categoryCode}`);

    // Find the maximum sequence number from similar styles
    let maxSequence = 0;

    // StyleCode format: {Brand[1]}{Season[4]}0{Category[3]}{Sequence[3+]}
    // First 9 characters are fixed: Brand(1) + Season(4) + "0"(1) + Category(3)
    // Everything after position 9 is the sequence number
    const FIXED_PREFIX_LENGTH = 9;

    for (const similarStyle of similarStyles) {
      if (similarStyle.StyleCode && similarStyle.StyleCode.length > FIXED_PREFIX_LENGTH) {
        // Extract sequence part (everything after position 9)
        const sequencePart = similarStyle.StyleCode.substring(FIXED_PREFIX_LENGTH);
        const sequenceNum = parseInt(sequencePart, 10);
        
        if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
          maxSequence = sequenceNum;
          console.log(`   Found sequence: ${sequenceNum} in StyleCode: ${similarStyle.StyleCode}`);
        }
      }
    }

    // Check if current style already has the maximum sequence
    const FIXED_PREFIX_LENGTH = 9;
    if (style.StyleCode && style.StyleCode.length > FIXED_PREFIX_LENGTH) {
      const currentSequencePart = style.StyleCode.substring(FIXED_PREFIX_LENGTH);
      const currentSequence = parseInt(currentSequencePart, 10);
      
      if (!isNaN(currentSequence) && currentSequence === maxSequence) {
        console.log(`\n✅ Style already has maximum sequence number: ${currentSequence}`);
        console.log(`   Current StyleCode: ${style.StyleCode}`);
        console.log(`   ⏭️  Skipping update - no need to consume new sequence number`);
        return null; // No update needed
      }
    }

    // Next sequence number
    const nextSequence = maxSequence + 1;
    const sequenceStr = nextSequence.toString().padStart(3, '0');

    const styleCode = `${brandChar}${seasonCode}${fixedZero}${categoryCode}${sequenceStr}`;
    const patternSpecNumber = styleCode; // Same as StyleCode per requirements

    console.log(`\n✅ Generated:`);
    console.log(`   Max existing sequence: ${maxSequence}`);
    console.log(`   Next sequence: ${nextSequence}`);
    console.log(`   StyleCode: ${styleCode}`);
    console.log(`   PatternSpecNumber: ${patternSpecNumber}`);

    return {
      StyleCode: styleCode,
      PatternSpecNumber: patternSpecNumber
    };
  }

  /**
   * Update style with new StyleCode
   * @param {number} styleId - Style ID
   * @param {string} styleCode - New StyleCode
   * @param {string} patternSpecNumber - New PatternSpecNumber
   * @returns {Promise<boolean>} Success status
   */
  async updateStyle(styleId, styleCode, patternSpecNumber) {
    const authHeader = await tokenService.getAuthorizationHeader();
    
    const url = `${this.baseUrl}/STYLE(${styleId})`;
    const payload = {
      StyleCode: styleCode,
      PatternSpecNumber: patternSpecNumber
    };

    console.log(`\n📝 Updating style ${styleId}:`);
    console.log(`   URL: ${url}`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    const response = await axios.patch(url, payload, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.status === 204) {
      console.log(`✅ Style updated successfully (HTTP 204)`);
      return true;
    } else {
      console.log(`⚠️  Unexpected response status: ${response.status}`);
      return false;
    }
  }

  /**
   * Sync style to search data (PLM Sync API)
   * @param {number} styleId - Style ID
   * @returns {Promise<boolean>} Success status
   */
  async syncToSearchData(styleId) {
    const authHeader = await tokenService.getAuthorizationHeader();
    
    const url = 'https://mingle-ionapi.eu1.inforcloudsuite.com/ATJZAMEWEF5P4SNV_TST/FASHIONPLM/job/api/job/tasks';
    const payload = {
      TaskId: 'syncSearchData',
      IsSystem: true,
      CustomData: [
        {
          key: 'cluster',
          value: 'styleoverview'
        },
        {
          key: 'moduleId',
          value: styleId.toString()
        },
        {
          key: 'schema',
          value: 'FSH2'
        },
        {
          key: 'updateOrgLevelPath',
          value: 'true'
        }
      ],
      Sequence: 1
    };

    console.log(`\n🔄 Syncing style ${styleId} to search data:`);
    console.log(`   URL: ${url}`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`✅ Sync task created successfully (HTTP ${response.status})`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return true;
    } catch (error) {
      console.error(`⚠️  Sync task failed (non-critical):`, error.message);
      if (error.response) {
        console.error(`   Response status: ${error.response.status}`);
        console.error(`   Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      // Don't throw error - sync is optional
      return false;
    }
  }

  /**
   * Process StyleCode assignment for a style
   * This is the main orchestration method
   * @param {number} styleId - Style ID
   * @returns {Promise<Object>} Result with StyleCode details
   */
  async processStyleCodeAssignment(styleId) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 Processing StyleCode Assignment for StyleId: ${styleId}`);
    console.log(`${'═'.repeat(70)}`);

    try {
      // Step 1: Get style details
      const style = await this.getStyleDetails(styleId);

      // Step 2: Get similar styles
      const similarStyles = await this.getSimilarStyles(
        style.Season.Id,
        style.ProductSubSubCategory.Id
      );

      // Step 3: Generate StyleCode
      const generated = this.generateStyleCode(style, similarStyles);

      // Check if update is needed
      if (!generated) {
        const result = {
          success: true,
          styleId: styleId,
          skipped: true,
          reason: 'Style already has maximum sequence number',
          currentStyleCode: style.StyleCode,
          brand: style.Brand,
          season: style.Season,
          productSubSubCategory: style.ProductSubSubCategory,
          similarStylesCount: similarStyles.length
        };

        console.log(`\n${'═'.repeat(70)}`);
        console.log(`✅ SUCCESS - No update needed (already at max sequence)`);
        console.log(`${'═'.repeat(70)}`);

        return result;
      }

      // Step 4: Update style
      await this.updateStyle(styleId, generated.StyleCode, generated.PatternSpecNumber);

      // Step 5: Sync to search data
      const syncSuccess = await this.syncToSearchData(styleId);

      const result = {
        success: true,
        styleId: styleId,
        skipped: false,
        oldStyleCode: style.StyleCode,
        newStyleCode: generated.StyleCode,
        patternSpecNumber: generated.PatternSpecNumber,
        brand: style.Brand,
        season: style.Season,
        productSubSubCategory: style.ProductSubSubCategory,
        similarStylesCount: similarStyles.length,
        syncedToSearchData: syncSuccess
      };

      console.log(`\n${'═'.repeat(70)}`);
      console.log(`✅ SUCCESS - StyleCode assigned ${syncSuccess ? '& synced' : '(sync failed)'}`);
      console.log(`${'═'.repeat(70)}`);

      return result;

    } catch (error) {
      console.error(`\n${'═'.repeat(70)}`);
      console.error(`❌ ERROR - StyleCode assignment failed`);
      console.error(`${'═'.repeat(70)}`);
      console.error(`Error: ${error.message}`);

      throw error;
    }
  }
}

// Create singleton instance
const plmService = new PLMService();

module.exports = plmService;
