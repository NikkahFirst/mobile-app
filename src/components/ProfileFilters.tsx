import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Filter, CheckCircle2, X, Ruler, Book, Lock, Crown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useSearchPreservation } from "@/context/SearchPreservationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerClose, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useTheme } from "@/hooks/use-theme";
import { checkIsFreemium } from "@/utils/freemiumUtils";

interface ProfileFiltersProps {
  onApplyFilters: (filters: FilterOptions) => void;
  onResetFilters: () => void;
}

export interface FilterOptions {
  ageMin?: number;
  ageMax?: number;
  country?: string;
  ethnicities?: string[];
  sect?: string;
  heightMin?: number;
  heightMax?: number;
}

const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", 
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", 
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", 
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", 
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", 
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", 
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", 
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", 
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", 
  "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", 
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", 
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", 
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", 
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", 
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", 
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", 
  "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", 
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", 
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", 
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", 
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const ethnicityOptions = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguans", "Argentinean", 
  "Armenian", "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", 
  "Barbadian", "Barbudans", "Batswana", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", 
  "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkina", "Burundi", 
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", 
  "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", 
  "Cypriot", "Czech", "Danish", "Djibouti", "Dominican", "Dutch", "East Timorese", "Ecuadorian", 
  "Egyptian", "Emirian", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", 
  "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", 
  "Grenadian", "Guatemalan", "Guinea-Bissauan", "Guinean", "Guyanese", "Haitian", "Herzegovinian", 
  "Honduran", "Hungarian", "I-Kiribati", "Icelander", "Indian", "Indonesian", "Iranian", "Iraqi", 
  "Irish", "Italian", "Ivory Coast", "Jamaican", "Japanese", "Jordanian", "Kazakhstani", "Kenyan", 
  "Kittian and Nevisian", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese", "Liberian", 
  "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourger", "Macedonian", "Malagasy", "Malawian", 
  "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese", "Mauritanian", "Mauritian", 
  "Mexican", "Micronesian", "Moldovan", "Monacan", "Mongolian", "Moroccan", "Mosotho", "Motswana", 
  "Mozambican", "Namibian", "Nauruan", "Nepalese", "New Zealander", "Ni-Vanuatu", "Nicaraguan", 
  "Nigerian", "Nigerien", "North Korean", "Northern Irish", "Norwegian", "Omani", "Pakistani", 
  "Palauan", "Palestinian", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", 
  "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", 
  "San Marinese", "Sao Tomean", "Saudi", "Scottish", "Senegalese", "Serbian", "Seychellois", 
  "Sierra Leonean", "Singaporean", "Slovakian", "Slovenian", "Solomon Islander", "Somali", 
  "South African", "South Korean", "Spanish", "Sri Lankan", "Sudanese", "Surinamer", "Swazi", 
  "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan", 
  "Trinidadian or Tobagonian", "Tunisian", "Turkish", "Tuvaluan", "Ugandan", "Ukrainian", 
  "Uruguayan", "Uzbekistani", "Venezuelan", "Vietnamese", "Welsh", "Yemenite", "Zambian", "Zimbabwean"
];

const sectOptions = ["Sunni", "Shia", "Salafi", "Other", "Don't know"];

const ProfileFilters = ({ onApplyFilters, onResetFilters }: ProfileFiltersProps) => {
  const { user } = useAuth();
  const { filters: savedFilters, setFilters: setSavedFilters, resetSearch, setResetSearch } = useSearchPreservation();
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 65]);
  const [minAgeInput, setMinAgeInput] = useState<string>("18");
  const [maxAgeInput, setMaxAgeInput] = useState<string>("65");
  const [country, setCountry] = useState<string>("");
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  const [sect, setSect] = useState<string>("");
  const [heightRange, setHeightRange] = useState<[number, number]>([150, 210]);
  const [minHeightInput, setMinHeightInput] = useState<string>("150");
  const [maxHeightInput, setMaxHeightInput] = useState<string>("210");
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [userCountry, setUserCountry] = useState<string>("");
  const [userPreferences, setUserPreferences] = useState<{
    looking_for_age_min?: number;
    looking_for_age_max?: number;
    looking_for_height_min?: number;
    looking_for_height_max?: number;
    looking_for_country?: string;
  } | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isFreemium, setIsFreemium] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Check if user is freemium
  useEffect(() => {
    if (user) {
      const freemiumStatus = checkIsFreemium(
        user.user_metadata?.gender || '',
        user.user_metadata?.subscription_status || ''
      );
      setIsFreemium(freemiumStatus);
    }
  }, [user]);

  const cmToFeetInches = (cm: number): string => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    
    if (inches === 12) {
      return `${feet + 1}'0"`;
    }
    
    return `${feet}'${inches}"`;
  };

  useEffect(() => {
    if (savedFilters && !initialLoadComplete) {
      console.log("Loading saved filters:", savedFilters);
      
      if (savedFilters.ageMin !== undefined && savedFilters.ageMax !== undefined) {
        setAgeRange([savedFilters.ageMin, savedFilters.ageMax]);
        setMinAgeInput(savedFilters.ageMin.toString());
        setMaxAgeInput(savedFilters.ageMax.toString());
      }
      
      if (savedFilters.country) {
        setCountry(savedFilters.country);
      }
      
      if (savedFilters.ethnicities && savedFilters.ethnicities.length > 0) {
        setSelectedEthnicities(savedFilters.ethnicities);
      }
      
      if (savedFilters.sect) {
        setSect(savedFilters.sect);
      }
      
      if (savedFilters.heightMin !== undefined && savedFilters.heightMax !== undefined) {
        setHeightRange([savedFilters.heightMin, savedFilters.heightMax]);
        setMinHeightInput(savedFilters.heightMin.toString());
        setMaxHeightInput(savedFilters.heightMax.toString());
      }
      
      onApplyFilters(savedFilters);
      
      let count = 0;
      if (savedFilters.ageMin !== 18 || savedFilters.ageMax !== 65) count++;
      if (savedFilters.country) count++;
      if (savedFilters.ethnicities && savedFilters.ethnicities.length > 0) count++;
      if (savedFilters.sect) count++;
      if (savedFilters.heightMin !== 150 || savedFilters.heightMax !== 210) count++;
      setActiveFiltersCount(count);
      
      setInitialLoadComplete(true);
    }
  }, [savedFilters, onApplyFilters]);

  useEffect(() => {
    if (resetSearch && initialLoadComplete) {
      console.log("Resetting search from external trigger");
      handleResetFilters();
      setResetSearch(false);
    }
  }, [resetSearch, setResetSearch]);

  useEffect(() => {
    if (user && !savedFilters && !initialLoadComplete) {
      const fetchUserPreferences = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('looking_for_age_min, looking_for_age_max, looking_for_height_min, looking_for_height_max, looking_for_country, country')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user preferences:", error);
        } else if (data) {
          setUserPreferences(data);
          setUserCountry(data.country || "");
          
          if (data.looking_for_age_min && data.looking_for_age_max) {
            const minAge = data.looking_for_age_min;
            const maxAge = data.looking_for_age_max;
            setAgeRange([minAge, maxAge]);
            setMinAgeInput(minAge.toString());
            setMaxAgeInput(maxAge.toString());
          }
          
          if (data.looking_for_height_min && data.looking_for_height_max) {
            const minHeight = data.looking_for_height_min;
            const maxHeight = data.looking_for_height_max;
            setHeightRange([minHeight, maxHeight]);
            setMinHeightInput(minHeight.toString());
            setMaxHeightInput(maxHeight.toString());
          }
          
          if (data.looking_for_country) {
            setCountry(data.looking_for_country);
          }
          
          let count = 0;
          if (data.looking_for_age_min !== 18 || data.looking_for_age_max !== 65) count++;
          if (data.looking_for_country) count++;
          if (data.looking_for_height_min !== 150 || data.looking_for_height_max !== 210) count++;
          setActiveFiltersCount(count);
          
          const initialFilters: FilterOptions = {};
          
          if (data.looking_for_age_min && data.looking_for_age_max) {
            initialFilters.ageMin = data.looking_for_age_min;
            initialFilters.ageMax = data.looking_for_age_max;
          }
          
          if (data.looking_for_country) {
            initialFilters.country = data.looking_for_country;
          }
          
          if (data.looking_for_height_min && data.looking_for_height_max) {
            initialFilters.heightMin = data.looking_for_height_min;
            initialFilters.heightMax = data.looking_for_height_max;
          }
          
          if (Object.keys(initialFilters).length > 0) {
            onApplyFilters(initialFilters);
            setSavedFilters(initialFilters);
          }
          
          setInitialLoadComplete(true);
        }
      };
      
      fetchUserPreferences();
    }
  }, [user, savedFilters]);

  useEffect(() => {
    if (showFilters && initialLoadComplete) {
      handleApplyFilters();
    }
  }, [ageRange, country, selectedEthnicities, sect, heightRange]);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
    if (!showFilters) {
      handleApplyFilters();
    }
  };

  const handleApplyFilters = () => {
    const filters: FilterOptions = {
      ageMin: ageRange[0],
      ageMax: ageRange[1]
    };
    
    // For freemium users, force certain filter values
    if (isFreemium) {
      // Lock country to user's home country
      if (userCountry) {
        filters.country = userCountry;
      }
      // Don't add other filters (ethnicities, sect, height) to keep them open
    } else {
      // Regular logic for subscribed users
      if (country && country !== "any") {
        filters.country = country;
      }
      
      if (selectedEthnicities.length > 0) {
        filters.ethnicities = selectedEthnicities;
      }
      
      if (sect && sect !== "any") {
        filters.sect = sect;
      }
      
      if (heightRange[0] !== 150 || heightRange[1] !== 210) {
        filters.heightMin = heightRange[0];
        filters.heightMax = heightRange[1];
      }
    }
    
    let count = 0;
    if (ageRange[0] !== 18 || ageRange[1] !== 65) count++;
    if (!isFreemium) {
      if (country && country !== "any") count++;
      if (selectedEthnicities.length > 0) count++;
      if (sect && sect !== "any") count++;
      if (heightRange[0] !== 150 || heightRange[1] !== 210) count++;
    } else {
      // For freemium, only count age filter
      if (userCountry) count++; // Always count locked country filter
    }
    
    setActiveFiltersCount(count);
    
    console.log("Setting filters in context:", filters);
    setSavedFilters(filters);
    
    onApplyFilters(filters);
  };

  const getSortedCountries = () => {
    if (!userCountry) return countries;
    
    return [
      userCountry,
      ...countries.filter(c => c !== userCountry)
    ];
  };

  const handleResetFilters = () => {
    setAgeRange([18, 65]);
    setMinAgeInput("18");
    setMaxAgeInput("65");
    
    if (!isFreemium) {
      setCountry("");
      setSelectedEthnicities([]);
      setSect("");
      setHeightRange([150, 210]);
      setMinHeightInput("150");
      setMaxHeightInput("210");
    } else {
      // For freemium, reset to locked states
      setCountry(userCountry);
      setSelectedEthnicities([]);
      setSect("");
      setHeightRange([150, 210]);
      setMinHeightInput("150");
      setMaxHeightInput("210");
    }
    
    setActiveFiltersCount(0);
    
    console.log("Clearing filters in context");
    setSavedFilters(null);
    
    onResetFilters();
    
    toast({
      title: "Filters Reset",
      description: "Your search filters have been reset."
    });
  };

  const handleEthnicityToggle = (ethnicity: string) => {
    setSelectedEthnicities(prev => {
      if (prev.includes(ethnicity)) {
        return prev.filter(e => e !== ethnicity);
      } else {
        return [...prev, ethnicity];
      }
    });
  };

  const removeEthnicity = (ethnicity: string) => {
    setSelectedEthnicities(prev => prev.filter(e => e !== ethnicity));
  };

  const handleMinAgeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinAgeInput(value);
    
    if (value === "" || isNaN(Number(value))) return;
    
    const numberValue = Number(value);
    if (numberValue >= 18 && numberValue <= ageRange[1]) {
      setAgeRange([numberValue, ageRange[1]]);
    }
  };

  const handleMaxAgeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxAgeInput(value);
    
    if (value === "" || isNaN(Number(value))) return;
    
    const numberValue = Number(value);
    if (numberValue >= ageRange[0] && numberValue <= 65) {
      setAgeRange([ageRange[0], numberValue]);
    }
  };

  const handleMinAgeBlur = () => {
    if (minAgeInput === "" || isNaN(Number(minAgeInput))) {
      setMinAgeInput(ageRange[0].toString());
    }
  };

  const handleMaxAgeBlur = () => {
    if (maxAgeInput === "" || isNaN(Number(maxAgeInput))) {
      setMaxAgeInput(ageRange[1].toString());
    }
  };

  const handleMinHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinHeightInput(value);
    
    if (value === "" || isNaN(Number(value))) return;
    
    const numberValue = Number(value);
    if (numberValue >= 150 && numberValue <= heightRange[1]) {
      setHeightRange([numberValue, heightRange[1]]);
    }
  };

  const handleMaxHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxHeightInput(value);
    
    if (value === "" || isNaN(Number(value))) {
      setMaxHeightInput(heightRange[1].toString());
    }
  };

  const handleMinHeightBlur = () => {
    if (minHeightInput === "" || isNaN(Number(minHeightInput))) {
      setMinHeightInput(heightRange[0].toString());
    }
  };

  const handleMaxHeightBlur = () => {
    if (maxHeightInput === "" || isNaN(Number(maxHeightInput))) {
      setMaxHeightInput(heightRange[1].toString());
    }
  };

  const closeFilters = () => {
    handleApplyFilters();
    setShowFilters(false);
  };

  const handleUpgrade = () => {
    navigate('/shop');
  };

  const renderFreemiumNotice = () => {
    if (!isFreemium) return null;
    
    return (
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center mb-2">
          <Lock className="h-4 w-4 text-yellow-600 mr-2" />
          <h4 className="font-medium text-yellow-800">Limited Filters</h4>
        </div>
        <p className="text-sm text-yellow-700 mb-3">
          To access all filters, please subscribe to unlock advanced search options.
        </p>
        <Button 
          onClick={handleUpgrade}
          size="sm"
          className="bg-nikkah-pink hover:bg-nikkah-pink/90 text-white"
        >
          <Crown className="h-4 w-4 mr-1" />
          Upgrade Now
        </Button>
      </div>
    );
  };

  const renderFilterContent = () => (
    <>
      {renderFreemiumNotice()}
      
      <div className="mb-6">
        <div className="text-nikkah-pink font-medium mb-3">Age Range</div>
        <div className="flex justify-between mb-2">
          <div className="flex items-center">
            <Input
              type="number"
              min="18"
              max={ageRange[1].toString()}
              value={minAgeInput}
              onChange={handleMinAgeInputChange}
              onBlur={handleMinAgeBlur}
              className="w-16 h-8 text-center"
            />
            <span className="ml-1 text-sm">years</span>
          </div>
          <div className="flex items-center">
            <Input
              type="number"
              min={ageRange[0].toString()}
              max="65"
              value={maxAgeInput}
              onChange={handleMaxAgeInputChange}
              onBlur={handleMaxAgeBlur}
              className="w-16 h-8 text-center"
            />
            <span className="ml-1 text-sm">years</span>
          </div>
        </div>
        <Slider
          defaultValue={[18, 65]}
          min={18}
          max={65}
          step={1}
          value={ageRange}
          onValueChange={(value) => {
            setAgeRange(value as [number, number]);
            setMinAgeInput(value[0].toString());
            setMaxAgeInput(value[1].toString());
          }}
          className="my-4"
        />
        <div className="text-center text-sm text-gray-500">
          Looking for ages {ageRange[0]} to {ageRange[1]}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-nikkah-pink font-medium mb-3 flex items-center">
          Country
          {isFreemium && <Lock className="h-4 w-4 ml-2 text-gray-400" />}
        </div>
        <Select 
          value={isFreemium ? userCountry : country} 
          onValueChange={isFreemium ? () => {} : setCountry}
          disabled={isFreemium}
        >
          <SelectTrigger className={`w-full ${isFreemium ? 'bg-gray-50 text-gray-500' : ''}`}>
            <SelectValue placeholder={isFreemium ? userCountry || "Your country" : "Select a country"} />
          </SelectTrigger>
          <SelectContent>
            {!isFreemium && <SelectItem value="any">Any country</SelectItem>}
            {getSortedCountries().map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFreemium && (
          <p className="text-xs text-gray-500 mt-1">
            Locked to your home country. Upgrade to search globally.
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="text-nikkah-pink font-medium mb-3 flex items-center">
          Ethnicity
          {isFreemium && <Lock className="h-4 w-4 ml-2 text-gray-400" />}
        </div>
        {isFreemium ? (
          <div className="p-4 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-600 text-center">
              Showing all ethnicities. Upgrade to filter by specific ethnicities.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-md p-2 overflow-x-hidden">
              {ethnicityOptions.map(ethnicity => (
                <Button
                  key={ethnicity}
                  type="button"
                  variant={selectedEthnicities.includes(ethnicity) ? "default" : "outline"}
                  className={`justify-start text-sm h-8 whitespace-normal break-words ${selectedEthnicities.includes(ethnicity) ? "bg-nikkah-pink" : ""}`}
                  onClick={() => handleEthnicityToggle(ethnicity)}
                >
                  {selectedEthnicities.includes(ethnicity) && <X className="mr-1 h-3 w-3" />}
                  {ethnicity}
                </Button>
              ))}
            </div>
            
            {selectedEthnicities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedEthnicities.map(ethnicity => (
                  <Badge key={ethnicity} variant="outline" className="flex items-center gap-1 bg-gray-50">
                    {ethnicity}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 ml-1" 
                      onClick={() => removeEthnicity(ethnicity)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mb-6">
        <div className="text-nikkah-pink font-medium mb-3">
          <div className="flex items-center">
            <Book className="h-4 w-4 mr-2" />
            Sect
            {isFreemium && <Lock className="h-4 w-4 ml-2 text-gray-400" />}
          </div>
        </div>
        {isFreemium ? (
          <div className="p-4 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-600 text-center">
              Showing all sects. Upgrade to filter by specific sect.
            </p>
          </div>
        ) : (
          <Select 
            value={sect} 
            onValueChange={setSect}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a sect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any sect</SelectItem>
              {sectOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mb-6">
        <div className="text-nikkah-pink font-medium mb-3">
          <div className="flex items-center">
            <Ruler className="h-4 w-4 mr-2" />
            Height Range
            {isFreemium && <Lock className="h-4 w-4 ml-2 text-gray-400" />}
          </div>
        </div>
        {isFreemium ? (
          <div className="p-4 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-600 text-center">
              Showing all heights (150-210 cm). Upgrade to set specific height preferences.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-2">
              <div className="flex items-center">
                <Input
                  type="number"
                  min="150"
                  max={heightRange[1].toString()}
                  value={minHeightInput}
                  onChange={handleMinHeightInputChange}
                  onBlur={handleMinHeightBlur}
                  className="w-16 h-8 text-center"
                />
                <span className="ml-1 text-sm">cm</span>
              </div>
              <div className="flex items-center">
                <Input
                  type="number"
                  min={heightRange[0].toString()}
                  max="210"
                  value={maxHeightInput}
                  onChange={handleMaxHeightInputChange}
                  onBlur={handleMaxHeightBlur}
                  className="w-16 h-8 text-center"
                />
                <span className="ml-1 text-sm">cm</span>
              </div>
            </div>
            <Slider
              defaultValue={[150, 210]}
              min={150}
              max={210}
              step={1}
              value={heightRange}
              onValueChange={(value) => {
                setHeightRange(value as [number, number]);
                setMinHeightInput(value[0].toString());
                setMaxHeightInput(value[1].toString());
              }}
              className="my-4"
            />
            <div className="text-center text-sm text-gray-500">
              Looking for height {heightRange[0]} cm ({cmToFeetInches(heightRange[0])}) to {heightRange[1]} cm ({cmToFeetInches(heightRange[1])})
            </div>
          </>
        )}
      </div>
    </>
  );

  const renderFilterButtons = () => (
    <div className="flex justify-between w-full">
      <Button 
        onClick={handleResetFilters} 
        variant="ghost" 
        size="sm"
        className="text-gray-500"
      >
        Reset
      </Button>
      <Button 
        onClick={closeFilters} 
        variant="default" 
        size="sm"
        className="bg-nikkah-pink text-white"
      >
        <CheckCircle2 className="h-4 w-4 mr-1" />
        Done
      </Button>
    </div>
  );

  return (
    <div>
      <Button 
        onClick={toggleFilters} 
        variant="outline" 
        size="sm"
        className="flex items-center gap-2 bg-background shadow-sm h-9"
      >
        <Filter className="h-4 w-4 text-nikkah-pink" />
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <div className="w-5 h-5 rounded-full bg-nikkah-pink text-white flex items-center justify-center text-xs">
            {activeFiltersCount}
          </div>
        )}
      </Button>
      
      {showFilters && !isMobile && (
  <div className="absolute top-12 left-0 z-50 w-[320px] bg-background p-5 rounded-lg shadow-lg border">
    {renderFilterContent()}
    <div className="mt-6 flex justify-between">
      {renderFilterButtons()}
    </div>
  </div>
)}


      {isMobile && (
        <Drawer 
          open={showFilters} 
          onOpenChange={setShowFilters}
          shouldScaleBackground={false}
        >
          <DrawerContent className={`max-h-[90vh] overflow-y-auto bg-background`}>
            <DrawerHeader>
              <DrawerTitle>Filter Profiles</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto">
              {renderFilterContent()}
            </div>
            <DrawerFooter>
              {renderFilterButtons()}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default ProfileFilters;

const ProfileCard = ({ 
  profile, 
  onRequestContact, 
  hiddenProfiles, 
  setHiddenProfiles,
  requestedProfiles, 
  setRequestedProfiles,
  requestingProfiles,
  setRequestingProfiles,
}: any) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast } = useToast();

  const alreadyRequested = useMemo(() => {
    return requestedProfiles.some((p: any) => p.id === profile.id);
  }, [requestedProfiles, profile.id]);

  const requestedByThisUser = useMemo(() => {
    return requestingProfiles.some((p: any) => p.id === profile.id);
  }, [requestingProfiles, profile.id]);

  const handleRequestContact = async () => {
    setIsRequesting(true);
    try {
      await onRequestContact(profile.id);
      toast({
        title: "Request sent!",
        description: "Your request has been sent to the user."
      });
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <></>
  );
};
