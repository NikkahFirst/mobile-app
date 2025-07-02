
// Mapping ethnicities to appropriate flag emojis
export const getEthnicityFlag = (ethnicity: string | string[] | null): string => {
  if (!ethnicity) return '🌎'; // World emoji for undefined ethnicity
  
  // If ethnicity is an array, use the first value
  const ethnicityValue = Array.isArray(ethnicity) ? ethnicity[0] : ethnicity;
  
  const ethnicityMap: Record<string, string> = {
    // Asian ethnicities
    'Asian': '🌏',
    'Chinese': '🇨🇳',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Vietnamese': '🇻🇳',
    'Filipino': '🇵🇭',
    'Thai': '🇹🇭',
    'Malay': '🇲🇾',
    'Indonesian': '🇮🇩',
    'Indian': '🇮🇳',
    'Pakistani': '🇵🇰',
    'Bangladeshi': '🇧🇩',
    'Sri Lankan': '🇱🇰',
    
    // Middle Eastern ethnicities
    'Middle Eastern': '🌍',
    'Arab': '🌍',
    'Turkish': '🇹🇷',
    'Iranian': '🇮🇷',
    'Iraqi': '🇮🇶',
    'Lebanese': '🇱🇧',
    'Syrian': '🇸🇾',
    'Saudi': '🇸🇦',
    'Emirati': '🇦🇪',
    'Qatari': '🇶🇦',
    'Kuwaiti': '🇰🇼',
    'Omani': '🇴🇲',
    'Bahraini': '🇧🇭',
    'Yemeni': '🇾🇪',
    'Palestinian': '🇵🇸',
    'Jordanian': '🇯🇴',
    
    // European ethnicities
    'European': '🇪🇺',
    'British': '🇬🇧',
    'English': '🇬🇧',
    'Irish': '🇮🇪',
    'Scottish': '🇬🇧',
    'Welsh': '🇬🇧',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Spanish': '🇪🇸',
    'Portuguese': '🇵🇹',
    'Dutch': '🇳🇱',
    'Belgian': '🇧🇪',
    'Swiss': '🇨🇭',
    'Austrian': '🇦🇹',
    'Swedish': '🇸🇪',
    'Norwegian': '🇳🇴',
    'Danish': '🇩🇰',
    'Finnish': '🇫🇮',
    'Polish': '🇵🇱',
    'Russian': '🇷🇺',
    'Ukrainian': '🇺🇦',
    'Greek': '🇬🇷',
    
    // African ethnicities
    'African': '🌍',
    'Nigerian': '🇳🇬',
    'Ghanaian': '🇬🇭',
    'Kenyan': '🇰🇪',
    'South African': '🇿🇦',
    'Egyptian': '🇪🇬',
    'Moroccan': '🇲🇦',
    'Algerian': '🇩🇿',
    'Tunisian': '🇹🇳',
    'Ethiopian': '🇪🇹',
    'Somali': '🇸🇴',
    'Sudanese': '🇸🇩',
    
    // American ethnicities
    'American': '🇺🇸',
    'Canadian': '🇨🇦',
    'Mexican': '🇲🇽',
    'Brazilian': '🇧🇷',
    'Argentinian': '🇦🇷',
    'Colombian': '🇨🇴',
    'Chilean': '🇨🇱',
    'Peruvian': '🇵🇪',
    
    // Other ethnicities
    'Australian': '🇦🇺',
    'New Zealander': '🇳🇿',
    'Mixed': '🌎',
    'Other': '🌎',
    
    // Add more specific ethnicities from South Asia
    'Bengali': '🇧🇩',
    'Tamil': '🇮🇳',
    'Punjabi': '🇮🇳',
    'Gujarati': '🇮🇳',
    'Kashmiri': '🇮🇳',
    'Sindhi': '🇵🇰',
    'Balochi': '🇵🇰',
    'Pashtun': '🇵🇰',
    
    // Add more specific ethnicities from Europe
    'Scandinavian': '🇸🇪',
    'Mediterranean': '🇮🇹',
    'Slavic': '🇷🇺',
    'Hispanic': '🇪🇸',
    'Latino': '🌎',
    'Caucasian': '🌍',
    
    // Add more specific ethnicities from Africa
    'North African': '🌍',
    'West African': '🌍',
    'East African': '🌍',
    'Central African': '🌍',
    'Southern African': '🌍',
    
    // Add more specific ethnicities from East Asia
    'Mongolian': '🇲🇳',
    'Taiwanese': '🇹🇼',
    'Hong Konger': '🇭🇰',
    
    // Add more specific ethnicities from Southeast Asia
    'Burmese': '🇲🇲',
    'Cambodian': '🇰🇭',
    'Laotian': '🇱🇦',
    'Singaporean': '🇸🇬'
  };
  
  // Normalize the ethnicity for case-insensitive matching
  const normalizedEthnicity = ethnicityValue.trim().toLowerCase();
  
  // Find the matching flag, case-insensitive
  for (const [key, flag] of Object.entries(ethnicityMap)) {
    if (normalizedEthnicity.includes(key.toLowerCase())) {
      return flag;
    }
  }
  
  // Default to world emoji if no match is found
  return '🌎';
};
