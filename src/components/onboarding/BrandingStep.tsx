/**
 * PHASE 4C: BRANDING STEP
 *
 * Configure company branding (logo, colors, business info).
 *
 * Form Fields:
 * - Logo URL: File upload preview (optional)
 * - Primary Color: Color picker
 * - Business Address: Text input (optional)
 * - Business Phone: Text input (optional)
 *
 * Features:
 * - Auto-save on field blur/change
 * - Color preview with sample UI elements
 * - Logo preview
 * - Mobile-optimized inputs
 * - Validation for phone format
 */

import React, { useState } from 'react';
import { Palette, Upload, Loader, Building, Phone, MapPin } from 'lucide-react';
import { useOnboardingStore } from '../../stores/onboardingStore';

export const BrandingStep: React.FC = () => {
  const branding = useOnboardingStore(state => state.branding);
  const updateBranding = useOnboardingStore(state => state.updateBranding);
  const saving = useOnboardingStore(state => state.saving);
  const error = useOnboardingStore(state => state.error);

  const [localAddress, setLocalAddress] = useState(branding.business_address || '');
  const [localPhone, setLocalPhone] = useState(branding.business_phone || '');

  const handleColorChange = async (color: string) => {
    await updateBranding({ primary_color: color });
  };

  const handleAddressBlur = async () => {
    if (localAddress !== branding.business_address) {
      await updateBranding({ business_address: localAddress || null });
    }
  };

  const handlePhoneBlur = async () => {
    if (localPhone !== branding.business_phone) {
      await updateBranding({ business_phone: localPhone || null });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, or SVG)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be smaller than 2MB');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await updateBranding({ logo_url: dataUrl });
    };
    reader.readAsDataURL(file);

    // TODO: [NATIVE-APP] File upload using FileReader API
    // Current: <input type="file"> with FileReader.readAsDataURL()
    // Native React Native: Use expo-image-picker library
    //   - Request permissions with requestMediaLibraryPermissionsAsync()
    //   - Launch picker with launchImageLibraryAsync({ allowsEditing: true })
    //   - Get base64 from result.assets[0].base64
    // Native iOS: UIImagePickerController
    // Native Android: Intent.ACTION_PICK with MediaStore
    // See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4c-1
    // MIGRATION RISK: LOW (expo-image-picker handles all platforms)
  };

  const colorPresets = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="bg-purple-100 p-3 rounded-full">
            <Palette className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Customize Your Branding
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Add your company logo and colors to personalize the TradeSphere experience.
          All fields are optional and can be updated later.
        </p>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <Loader className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Saving your branding...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Company Logo (Optional)
        </label>
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Logo Preview */}
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt="Company Logo"
                className="max-w-full max-h-full object-contain p-2"
              />
            ) : (
              <Building className="w-12 h-12 text-gray-400" />
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all"
              style={{ minHeight: '44px' }}
            >
              <Upload className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">
                {branding.logo_url ? 'Change Logo' : 'Upload Logo'}
              </span>
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG, or SVG • Max 2MB
            </p>
          </div>
        </div>
      </div>

      {/* Primary Color */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Primary Brand Color
        </label>

        {/* Color Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {colorPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleColorChange(preset.value)}
              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                branding.primary_color === preset.value
                  ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-800'
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{
                backgroundColor: preset.value,
                minWidth: '48px',
                minHeight: '48px'
              }}
              title={preset.name}
            />
          ))}

          {/* Custom Color Picker */}
          {/* TODO: [NATIVE-APP] HTML5 color picker input
              Current: <input type="color"> for custom color selection
              Native React Native Option 1: Use react-native-color-picker library
              Native React Native Option 2 (Recommended): Remove custom picker, use preset swatches only
                - Preset swatches already implemented and mobile-friendly
                - Simpler UX, no library dependency
              See: docs/pre-production-map/MOBILE-DEV-TRACKING.md#phase-4c-2
              MIGRATION RISK: LOW (preset swatches work as-is) */}
          <label
            className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 cursor-pointer flex items-center justify-center transition-all"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <Palette className="w-5 h-5 text-gray-500" />
            <input
              type="color"
              value={branding.primary_color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        {/* Color Preview */}
        <div
          className="rounded-lg p-4 border-2"
          style={{
            backgroundColor: branding.primary_color + '15',
            borderColor: branding.primary_color
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">
              Selected Color
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: branding.primary_color }}
              />
              <code className="text-sm font-mono text-gray-700">
                {branding.primary_color.toUpperCase()}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Business Address */}
      <div>
        <label htmlFor="business-address" className="block text-sm font-semibold text-gray-800 mb-2">
          Business Address (Optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="business-address"
            type="text"
            value={localAddress}
            onChange={(e) => setLocalAddress(e.target.value)}
            onBlur={handleAddressBlur}
            placeholder="123 Main St, City, State 12345"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ minHeight: '48px' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This will appear on quotes and invoices
        </p>
      </div>

      {/* Business Phone */}
      <div>
        <label htmlFor="business-phone" className="block text-sm font-semibold text-gray-800 mb-2">
          Business Phone (Optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="business-phone"
            type="tel"
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="(555) 123-4567"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ minHeight: '48px' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Contact number for customer inquiries
        </p>
      </div>

      {/* Optional Reminder */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> All branding fields are optional. You can skip this step
          and add these details later from your company settings.
        </p>
      </div>
    </div>
  );
};
