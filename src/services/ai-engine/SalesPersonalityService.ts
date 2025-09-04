/**
 * SalesPersonalityService - Dynamic response formatting with sales personality
 * 
 * Replicates Make.com's sales personality matrix with price-based tone adjustment
 * Formats responses to match landscaping industry professional standards
 */

import { PricingResult, ServiceQuote } from './PricingCalculatorService';
import { ExtractedService } from './ParameterCollectorService';

export interface SalesResponse {
  message: string;
  tone: 'casual' | 'professional' | 'premium';
  priceRange: 'budget' | 'mid-range' | 'premium' | 'luxury';
  urgency: 'routine' | 'seasonal' | 'emergency';
  followUpSuggestions: string[];
}

export interface CustomerContext {
  firstName?: string;
  jobTitle?: string;
  isReturnCustomer?: boolean;
  projectType?: string;
  urgencyLevel?: 'routine' | 'seasonal' | 'emergency';
}

export class SalesPersonalityService {
  // Price range thresholds for tone adjustment
  private static readonly PRICE_THRESHOLDS = {
    budget: { min: 0, max: 500 },
    midRange: { min: 500, max: 2000 },
    premium: { min: 2000, max: 5000 },
    luxury: { min: 5000, max: Infinity }
  };

  // Seasonal considerations for urgency
  private static readonly SEASONAL_SERVICES = [
    'Sod Install',
    'Seed/Straw',
    'Tree',
    'Shrub',
    'Perennial',
    'Annuals'
  ];

  /**
   * Main entry point - format pricing response with sales personality
   */
  static formatSalesResponse(
    pricingResult: PricingResult,
    customerContext: CustomerContext = {},
    requestType: 'pricing' | 'clarification' | 'follow_up' = 'pricing'
  ): SalesResponse {
    
    // 🎭 ENHANCED DEBUG: RESPONSE FORMATTING START
    console.log('🎭 RESPONSE FORMATTING START:', {
      customerName: customerContext.firstName,
      jobTitle: customerContext.jobTitle,
      urgencyLevel: customerContext.urgencyLevel,
      responseType: requestType,
      totalCost: pricingResult.totals?.totalCost,
      servicesCount: pricingResult.services?.length,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📝 SALES PERSONALITY: ${requestType}, $${pricingResult.totals.totalCost}`);

    const priceRange = this.determinePriceRange(pricingResult.totals.totalCost);
    const tone = this.determineTone(priceRange, customerContext);
    const urgency = this.determineUrgency(pricingResult.services, customerContext);
    
    // 🎭 ENHANCED DEBUG: PERSONALITY ANALYSIS
    console.log('🎭 PERSONALITY ANALYSIS:', {
      customerContext: {
        firstName: customerContext.firstName,
        urgencyLevel: customerContext.urgencyLevel,
        isReturnCustomer: customerContext.isReturnCustomer
      },
      pricingContext: {
        totalCost: pricingResult.totals?.totalCost,
        serviceCount: pricingResult.services?.length,
        priceRange: pricingResult.totals?.totalCost > 500 ? 'high' : 'standard'
      },
      selectedTone: tone,
      determinedUrgency: urgency
    });

    let message: string;

    switch (requestType) {
      case 'pricing':
        message = this.formatPricingMessage(pricingResult, tone, priceRange, customerContext);
        break;
      case 'clarification':
        message = this.formatClarificationMessage(tone, customerContext);
        break;
      case 'follow_up':
        message = this.formatFollowUpMessage(tone, customerContext);
        break;
    }

    const followUpSuggestions = this.generateFollowUpSuggestions(
      pricingResult, 
      priceRange, 
      urgency
    );
    
    // 🎭 ENHANCED DEBUG: FINAL RESPONSE GENERATED
    console.log('🎭 FINAL RESPONSE GENERATED:', {
      messageLength: message?.length || 0,
      includesPrice: message?.includes('$') || false,
      includesTotalCost: message?.includes(pricingResult.totals?.totalCost?.toString()) || false,
      tone: tone,
      followUpSuggestionCount: followUpSuggestions?.length || 0,
      timestamp: new Date().toISOString()
    });

    return {
      message,
      tone,
      priceRange,
      urgency,
      followUpSuggestions
    };
  }

  /**
   * Determine price range category
   */
  private static determinePriceRange(totalCost: number): 'budget' | 'mid-range' | 'premium' | 'luxury' {
    if (totalCost <= this.PRICE_THRESHOLDS.budget.max) return 'budget';
    if (totalCost <= this.PRICE_THRESHOLDS.midRange.max) return 'mid-range';
    if (totalCost <= this.PRICE_THRESHOLDS.premium.max) return 'premium';
    return 'luxury';
  }

  /**
   * Determine appropriate tone based on price range and customer context
   */
  private static determineTone(
    priceRange: string, 
    customerContext: CustomerContext
  ): 'casual' | 'professional' | 'premium' {
    
    // Premium tone for high-value projects
    if (priceRange === 'luxury' || priceRange === 'premium') {
      return 'premium';
    }
    
    // Professional tone for business customers
    if (customerContext.jobTitle?.toLowerCase().includes('manager') || 
        customerContext.jobTitle?.toLowerCase().includes('owner')) {
      return 'professional';
    }
    
    // Default to professional for mid-range, casual for budget
    return priceRange === 'budget' ? 'casual' : 'professional';
  }

  /**
   * Determine urgency level based on services and context
   */
  private static determineUrgency(
    services: ServiceQuote[], 
    customerContext: CustomerContext
  ): 'routine' | 'seasonal' | 'emergency' {
    
    // Override from customer context
    if (customerContext.urgencyLevel) {
      return customerContext.urgencyLevel;
    }
    
    // Check for seasonal services
    const hasSeasonalServices = services.some(service => 
      this.SEASONAL_SERVICES.some(seasonal => service.serviceName.includes(seasonal))
    );
    
    if (hasSeasonalServices) return 'seasonal';
    
    // Default to routine
    return 'routine';
  }

  /**
   * Format main pricing response message
   */
  private static formatPricingMessage(
    pricingResult: PricingResult,
    tone: string,
    priceRange: string,
    customerContext: CustomerContext
  ): string {
    
    const greeting = this.getGreeting(tone, customerContext);
    const projectSummary = this.formatProjectSummary(pricingResult, tone);
    const pricingDetails = this.formatPricingDetails(pricingResult, tone, priceRange);
    const closing = this.getClosing(tone, priceRange);

    return `${greeting}\n\n${projectSummary}\n\n${pricingDetails}\n\n${closing}`;
  }

  /**
   * Get appropriate greeting based on tone and customer
   */
  private static getGreeting(tone: string, customerContext: CustomerContext): string {
    const name = customerContext.firstName || '';
    
    switch (tone) {
      case 'premium':
        return name ? 
          `Thank you for considering our services, ${name}.` :
          'Thank you for your interest in our premium landscaping services.';
          
      case 'professional':
        return name ?
          `Hi ${name}, here's your landscaping project estimate:` :
          'Here\'s your professional landscaping estimate:';
          
      case 'casual':
        return name ?
          `Hey ${name}! Here's what your landscaping project would look like:` :
          'Great! Here\'s what your landscaping project would cost:';
          
      default:
        return 'Here\'s your landscaping project estimate:';
    }
  }

  /**
   * Format project summary section
   */
  private static formatProjectSummary(pricingResult: PricingResult, tone: string): string {
    if (pricingResult.services.length === 1) {
      const service = pricingResult.services[0];
      
      switch (tone) {
        case 'premium':
          return `PROJECT SCOPE:\nWe would be delighted to provide ${service.quantity} ${service.unit} of ${service.serviceName} for your property.`;
          
        case 'professional':
          return `PROJECT SUMMARY:\n${service.serviceName}: ${service.quantity} ${service.unit}`;
          
        case 'casual':
          return `YOUR PROJECT:\n${service.quantity} ${service.unit} of ${service.serviceName}`;
          
        default:
          return `${service.serviceName}: ${service.quantity} ${service.unit}`;
      }
    } else {
      const serviceCount = pricingResult.services.length;
      
      switch (tone) {
        case 'premium':
          return `PROJECT SCOPE:\nYour comprehensive landscaping project includes ${serviceCount} professional services:`;
          
        case 'professional':
          return `PROJECT BREAKDOWN (${serviceCount} services):`;
          
        case 'casual':
          return `YOUR PROJECT INCLUDES ${serviceCount} SERVICES:`;
          
        default:
          return `PROJECT BREAKDOWN:`;
      }
    }
  }

  /**
   * Format detailed pricing breakdown
   */
  private static formatPricingDetails(
    pricingResult: PricingResult, 
    tone: string, 
    priceRange: string
  ): string {
    
    let details = '';
    
    if (pricingResult.services.length === 1) {
      const service = pricingResult.services[0];
      details = this.formatSingleServicePricing(service, tone, priceRange);
    } else {
      details = this.formatMultiServicePricing(pricingResult, tone, priceRange);
    }
    
    return details;
  }

  /**
   * Format single service pricing
   */
  private static formatSingleServicePricing(
    service: ServiceQuote, 
    tone: string, 
    priceRange: string
  ): string {
    
    switch (tone) {
      case 'premium':
        return `INVESTMENT DETAILS:
• Service: ${service.serviceName}
• Scope: ${service.quantity} ${service.unit}
• Professional Labor: ${service.laborHours.toFixed(1)} hours
• Total Investment: $${service.cost.toFixed(2)}

This pricing includes all materials, professional installation, and our quality guarantee.`;

      case 'professional':
        return `PRICING BREAKDOWN:
${service.serviceName}: ${service.quantity} ${service.unit}
Labor Hours: ${service.laborHours.toFixed(1)}h
Total Cost: $${service.cost.toFixed(2)}`;

      case 'casual':
        return `Here's the breakdown:
${service.serviceName} (${service.quantity} ${service.unit})
Time needed: ${service.laborHours.toFixed(1)} hours
Your cost: $${service.cost.toFixed(2)}`;

      default:
        return `${service.serviceName}: ${service.quantity} ${service.unit}
Cost: $${service.cost.toFixed(2)}
Hours: ${service.laborHours.toFixed(1)}h`;
    }
  }

  /**
   * Format multi-service pricing
   */
  private static formatMultiServicePricing(
    pricingResult: PricingResult, 
    tone: string, 
    priceRange: string
  ): string {
    
    let details = '';
    
    // Service breakdown
    pricingResult.services.forEach(service => {
      switch (tone) {
        case 'premium':
          details += `• ${service.serviceName}: ${service.quantity} ${service.unit} - $${service.cost.toFixed(2)}\n`;
          break;
        case 'professional':
          details += `${service.serviceName}: ${service.quantity} ${service.unit} - $${service.cost.toFixed(2)} (${service.laborHours.toFixed(1)}h)\n`;
          break;
        case 'casual':
          details += `✓ ${service.serviceName} (${service.quantity} ${service.unit}): $${service.cost.toFixed(2)}\n`;
          break;
      }
    });
    
    // Totals
    switch (tone) {
      case 'premium':
        details += `\nTOTAL PROJECT INVESTMENT: $${pricingResult.totals.totalCost.toFixed(2)}`;
        details += `\nEstimated Completion Time: ${pricingResult.totals.totalLaborHours.toFixed(1)} hours`;
        break;
        
      case 'professional':
        details += `\nTOTAL PROJECT COST: $${pricingResult.totals.totalCost.toFixed(2)}`;
        details += `\nTOTAL LABOR HOURS: ${pricingResult.totals.totalLaborHours.toFixed(1)}h`;
        break;
        
      case 'casual':
        details += `\n🏆 TOTAL: $${pricingResult.totals.totalCost.toFixed(2)}`;
        details += `\n⏱️ Time: ${pricingResult.totals.totalLaborHours.toFixed(1)} hours`;
        break;
    }
    
    return details;
  }

  /**
   * Get appropriate closing based on tone and price range
   */
  private static getClosing(tone: string, priceRange: string): string {
    switch (tone) {
      case 'premium':
        return 'We look forward to the opportunity to transform your outdoor space. Please let us know if you have any questions about this proposal.';
        
      case 'professional':
        if (priceRange === 'luxury') {
          return 'This comprehensive project would significantly enhance your property value. Would you like to discuss the details or timeline?';
        } else {
          return 'Let me know if you\'d like to move forward or if you have any questions about the pricing.';
        }
        
      case 'casual':
        if (priceRange === 'budget') {
          return 'This is a great project to get your landscaping started! Ready to make it happen?';
        } else {
          return 'Looks like an awesome project! Want to chat about next steps?';
        }
        
      default:
        return 'Please let me know if you have any questions or would like to proceed.';
    }
  }

  /**
   * Format clarification request message
   */
  private static formatClarificationMessage(tone: string, customerContext: CustomerContext): string {
    const name = customerContext.firstName ? ` ${customerContext.firstName}` : '';
    
    switch (tone) {
      case 'premium':
        return `Thank you${name} for your inquiry. To provide you with the most accurate estimate for your landscaping project, I need a few additional details.`;
        
      case 'professional':
        return `Hi${name}! I'd like to give you an accurate quote for your landscaping project. I just need a few more details:`;
        
      case 'casual':
        return `Hey${name}! I want to get you the best pricing for your project. Can you help me with a couple details?`;
        
      default:
        return 'I need a few more details to provide accurate pricing:';
    }
  }

  /**
   * Format follow-up message
   */
  private static formatFollowUpMessage(tone: string, customerContext: CustomerContext): string {
    const name = customerContext.firstName ? ` ${customerContext.firstName}` : '';
    
    switch (tone) {
      case 'premium':
        return `Thank you${name} for the additional information. Let me update your project estimate with these details.`;
        
      case 'professional':
        return `Perfect${name}! With this additional information, here's your updated project estimate:`;
        
      case 'casual':
        return `Great${name}! Now I can give you a much better estimate:`;
        
      default:
        return 'Thanks for the additional information. Here\'s your updated estimate:';
    }
  }

  /**
   * Generate contextual follow-up suggestions
   */
  private static generateFollowUpSuggestions(
    pricingResult: PricingResult,
    priceRange: string,
    urgency: string
  ): string[] {
    
    const suggestions: string[] = [];
    
    // Price-based suggestions
    switch (priceRange) {
      case 'budget':
        suggestions.push('Would you like to explore ways to phase this project over time?');
        suggestions.push('Are there any services you\'d like to prioritize first?');
        break;
        
      case 'mid-range':
        suggestions.push('Would you like to discuss financing options?');
        suggestions.push('Should we schedule a site visit to review the details?');
        break;
        
      case 'premium':
        suggestions.push('Would you like to schedule a consultation to discuss the timeline?');
        suggestions.push('Are there any additional services you\'d like to consider?');
        break;
        
      case 'luxury':
        suggestions.push('Would you prefer to schedule a detailed design consultation?');
        suggestions.push('Should we discuss premium material upgrades?');
        break;
    }
    
    // Urgency-based suggestions
    switch (urgency) {
      case 'seasonal':
        suggestions.push('Should we prioritize this for the optimal planting season?');
        break;
        
      case 'emergency':
        suggestions.push('Would you like to schedule this as a priority project?');
        break;
    }
    
    // Service-specific suggestions
    const categories = Array.from(new Set(pricingResult.services.map(s => s.category)));
    
    if (categories.includes('planting')) {
      suggestions.push('Would you like recommendations for plant varieties?');
    }
    
    if (categories.includes('irrigation')) {
      suggestions.push('Should we include a maintenance plan for the irrigation system?');
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Get response for special service clarification
   */
  static formatSpecialServiceClarification(
    serviceName: string, 
    missingRequirements: string[]
  ): string {
    
    if (serviceName.includes('Irrigation')) {
      return `For your irrigation system, I need to know:
• How many zones do you need (separate turf areas vs drip zones)?
• Will we need to bore under any driveways or sidewalks?
• What type of sprinkler heads do you prefer?

This helps me give you the most accurate pricing for your irrigation installation.`;
    }
    
    // Default special service clarification
    return `For ${serviceName}, I need some additional details: ${missingRequirements.join(', ')}`;
  }

  /**
   * Format error message with appropriate tone
   */
  static formatErrorMessage(error: string, tone: 'casual' | 'professional' | 'premium' = 'professional'): string {
    switch (tone) {
      case 'premium':
        return `I apologize, but I'm currently unable to calculate pricing for your project. Please allow me to gather the necessary information and provide you with an accurate estimate shortly.`;
        
      case 'casual':
        return `Oops! I'm having trouble calculating your pricing right now. Let me get that sorted out for you!`;
        
      default:
        return `I'm having difficulty calculating your pricing at the moment. Let me gather the information and get back to you with an accurate estimate.`;
    }
  }
}