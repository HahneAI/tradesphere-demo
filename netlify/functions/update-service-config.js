/**
 * Netlify Function: Update Service Configuration
 * Updates the paver-patio-formula.json file when admin makes changes in Services tab
 */

const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  try {
    console.log('🔧 CONFIG UPDATE: Received service configuration update request');

    // Parse the request body
    const { serviceId, configData } = JSON.parse(event.body);

    if (!serviceId || !configData) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Missing serviceId or configData',
          received: { serviceId: !!serviceId, configData: !!configData }
        })
      };
    }

    // Only handle paver patio config for now
    if (serviceId !== 'paver_patio_sqft') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: `Unsupported serviceId: ${serviceId}`
        })
      };
    }

    // Path to the JSON config file
    const jsonFilePath = path.join(process.cwd(), 'src', 'pricing-system', 'config', 'paver-patio-formula.json');

    console.log('🔧 CONFIG UPDATE: Updating JSON file at:', jsonFilePath);

    // Read current JSON file
    let currentConfig;
    try {
      const currentContent = await fs.readFile(jsonFilePath, 'utf8');
      currentConfig = JSON.parse(currentContent);
    } catch (readError) {
      console.error('❌ Failed to read current config:', readError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Failed to read current configuration file',
          details: readError.message
        })
      };
    }

    // Merge the updates (preserve structure, update only changed values)
    const updatedConfig = {
      ...currentConfig,
      baseSettings: {
        laborSettings: {
          ...currentConfig.baseSettings?.laborSettings,
          ...configData.baseSettings?.laborSettings
        },
        materialSettings: {
          ...currentConfig.baseSettings?.materialSettings,
          ...configData.baseSettings?.materialSettings
        },
        businessSettings: {
          ...currentConfig.baseSettings?.businessSettings,
          ...configData.baseSettings?.businessSettings
        }
      },
      // Also update variables if provided
      variables: configData.variables ? {
        ...currentConfig.variables,
        ...configData.variables
      } : currentConfig.variables,
      lastModified: new Date().toISOString().split('T')[0],
      modifiedBy: 'admin_services_tab'
    };

    // Write the updated config back to the JSON file
    await fs.writeFile(jsonFilePath, JSON.stringify(updatedConfig, null, 2), 'utf8');

    console.log('✅ CONFIG UPDATE: JSON file updated successfully');
    console.log('🔧 CONFIG UPDATE: Updated settings:', {
      laborSettings: Object.keys(configData.baseSettings?.laborSettings || {}),
      materialSettings: Object.keys(configData.baseSettings?.materialSettings || {}),
      businessSettings: Object.keys(configData.baseSettings?.businessSettings || {}),
      variablesUpdated: !!configData.variables
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Service configuration updated successfully',
        serviceId: serviceId,
        updatedAt: new Date().toISOString(),
        settingsUpdated: {
          laborSettings: Object.keys(configData.baseSettings?.laborSettings || {}),
          materialSettings: Object.keys(configData.baseSettings?.materialSettings || {}),
          businessSettings: Object.keys(configData.baseSettings?.businessSettings || {}),
          variables: !!configData.variables
        }
      })
    };

  } catch (error) {
    console.error('❌ CONFIG UPDATE ERROR:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error during config update',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};