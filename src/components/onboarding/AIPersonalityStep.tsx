/**
 * PHASE 4C: AI PERSONALITY STEP
 *
 * Configure AI pricing assistant personality and communication style.
 *
 * Form Fields:
 * - Tone: professional | friendly | casual
 * - Formality: formal | balanced | informal
 * - Industry Language: standard | technical | simplified
 * - Sales Approach: consultative | direct | educational
 *
 * Features:
 * - Auto-save on change using store
 * - Visual radio button groups with descriptions
 * - Saving indicator
 * - Mobile-optimized layout
 */

import React from 'react';
import { MessageSquare, Loader } from 'lucide-react';
import { useOnboardingStore, AIPersonalityConfig } from '../../stores/onboardingStore';

type RadioOption<T> = {
  value: T;
  label: string;
  description: string;
};

export const AIPersonalityStep: React.FC = () => {
  const aiPersonality = useOnboardingStore(state => state.aiPersonality);
  const updateAIPersonality = useOnboardingStore(state => state.updateAIPersonality);
  const saving = useOnboardingStore(state => state.saving);
  const error = useOnboardingStore(state => state.error);

  const handleChange = async (field: keyof AIPersonalityConfig, value: string) => {
    await updateAIPersonality({ [field]: value });
  };

  const toneOptions: RadioOption<AIPersonalityConfig['tone']>[] = [
    {
      value: 'professional',
      label: 'Professional',
      description: 'Formal, business-focused communication with industry expertise'
    },
    {
      value: 'friendly',
      label: 'Friendly',
      description: 'Approachable and personable while maintaining professionalism'
    },
    {
      value: 'casual',
      label: 'Casual',
      description: 'Relaxed, conversational tone that feels like talking to a colleague'
    }
  ];

  const formalityOptions: RadioOption<AIPersonalityConfig['formality']>[] = [
    {
      value: 'formal',
      label: 'Formal',
      description: 'Structured language with proper grammar and business terminology'
    },
    {
      value: 'balanced',
      label: 'Balanced',
      description: 'Mix of professional and conversational communication'
    },
    {
      value: 'informal',
      label: 'Informal',
      description: 'Everyday language that\'s easy to understand and natural'
    }
  ];

  const industryLanguageOptions: RadioOption<AIPersonalityConfig['industry_language']>[] = [
    {
      value: 'standard',
      label: 'Standard',
      description: 'Common industry terms that most customers understand'
    },
    {
      value: 'technical',
      label: 'Technical',
      description: 'Detailed technical terminology for expert customers'
    },
    {
      value: 'simplified',
      label: 'Simplified',
      description: 'Plain language explanations for all customers'
    }
  ];

  const salesApproachOptions: RadioOption<AIPersonalityConfig['sales_approach']>[] = [
    {
      value: 'consultative',
      label: 'Consultative',
      description: 'Ask questions, understand needs, and recommend solutions'
    },
    {
      value: 'direct',
      label: 'Direct',
      description: 'Get straight to pricing and key details efficiently'
    },
    {
      value: 'educational',
      label: 'Educational',
      description: 'Explain options, benefits, and trade-offs in detail'
    }
  ];

  const RadioGroup = <T extends string>({
    label,
    options,
    value,
    onChange,
    name
  }: {
    label: string;
    options: RadioOption<T>[];
    value: T;
    onChange: (value: T) => void;
    name: string;
  }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{label}</h3>
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            className={`block cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-blue-300 ${
              value === option.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
            style={{ minHeight: '72px' }}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value as T)}
                className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">
                  {option.label}
                </div>
                <div className="text-sm text-gray-600">
                  {option.description}
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-gray-200">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Configure Your AI Assistant
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Customize how your AI pricing assistant communicates with you and your team.
          These settings help match your company's voice and sales style.
        </p>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <Loader className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Saving your preferences...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        <RadioGroup
          label="Communication Tone"
          options={toneOptions}
          value={aiPersonality.tone}
          onChange={(value) => handleChange('tone', value)}
          name="tone"
        />

        <RadioGroup
          label="Formality Level"
          options={formalityOptions}
          value={aiPersonality.formality}
          onChange={(value) => handleChange('formality', value)}
          name="formality"
        />

        <RadioGroup
          label="Industry Language"
          options={industryLanguageOptions}
          value={aiPersonality.industry_language}
          onChange={(value) => handleChange('industry_language', value)}
          name="industry_language"
        />

        <RadioGroup
          label="Sales Approach"
          options={salesApproachOptions}
          value={aiPersonality.sales_approach}
          onChange={(value) => handleChange('sales_approach', value)}
          name="sales_approach"
        />
      </div>

      {/* Preview Hint */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-gray-700">
          <strong>Tip:</strong> You can change these settings anytime from your dashboard.
          Try different combinations to find what works best for your team.
        </p>
      </div>
    </div>
  );
};
