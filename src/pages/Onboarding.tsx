import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, Heart, Check, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useOnboardingReferral } from "@/hooks/use-referral";
import NavBar from "@/components/NavBar";
import ImageUpload from "@/components/ImageUpload";
import { Checkbox } from "@/components/ui/checkbox";

const STEPS = [
  "ethnicity",
  "country",
  "marital-status",
  "sect",
  "age",
  "height",
  "weight",
  "salah",
  "profession",
  "highest-education",
  "self-summary",
  "islamic-practices",
  "looking-for-ethnicity",
  "looking-for-age",
  "looking-for-height",
  "looking-for-country",
  "looking-for-summary",
  "photos"
];

const ETHNICITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguans", "Argentinean", 
  "Armenian", "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", 
  "Barbadian", "Barbudans", "Batswana", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", 
  "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkina", "Burundi", 
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", 
  "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", 
  "Cypriot", "Czech", "Danish", "Djibouti", "Dominican", "Dutch", "East Timorese", "Ecuadorean", 
  "Egyptian", "Emirian", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", 
  "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", 
  "Grenadian", "Guatemala", "Guinea-Bissauan", "Guinean", "Guyanese", "Haitian", "Herzegovinian", 
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

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua & Deps", "Argentina", "Armenia", 
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", 
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia Herzegovina", "Botswana", "Brazil", 
  "Brunei", "Bulgaria", "Burkina", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", 
  "Central African Rep", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", 
  "Congo {Democratic Rep}", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", 
  "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", 
  "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", 
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", 
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", 
  "Iran", "Iraq", "Ireland {Republic}", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", 
  "Kazakhstan", "Kenya", "Kiribati", "Korea North", "Korea South", "Kosovo", "Kuwait", "Kyrgyzstan", 
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberian", "Libya", "Liechtenstein", "Lithuania", 
  "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", 
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", 
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar, {Burma}", "Namibia", "Nauru", 
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", 
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", 
  "Poland", "Portugal", "Qatar", "Romanian", "Russian Federation", "Rwanda", "St Kitts & Nevis", 
  "St Lucia", "Saint Vincent & the Grenadines", "Samoa", "San Marino", "Sao Tome & Principe", 
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", 
  "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", 
  "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", 
  "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad & Tobago", "Tunisia", "Turkey", "Turkmenistan", 
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", 
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", 
  "Zimbabwe"
];

const EDUCATION_LEVELS = ["None", "GCSE", "A-level", "Degree", "Masters", "Doctorate"];

const SALAH_OPTIONS = ["5 times a day", "Less than 5 a day", "Sometimes", "Rarely", "Never"];

const MARITAL_STATUS = ["Never Married", "Divorced", "Widowed", "Married"];

const SECTS = ["Sunni", "Shia", "Salafi", "Other", "Don't know"];

const calculateAge = (birthDateString: string): number => {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const Onboarding = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [validationError, setValidationError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [onboardingCompletedState, setOnboardingCompletedState] = useState(false);

  useOnboardingReferral(onboardingCompletedState);

  const [formData, setFormData] = useState({
    gender: "",
    ethnicity: [] as string[],
    country: "",
    marital_status: "",
    sect: "",
    date_of_birth: "",
    height_cm: 0,
    weight_kg: 0,
    salah: "",
    profession: "",
    highest_education: "",
    self_summary: "",
    islamic_practices: "",
    looking_for_ethnicity: [] as string[],
    looking_for_age_min: 18,
    looking_for_age_max: 50,
    looking_for_height_min: 147,
    looking_for_height_max: 213,
    looking_for_country: [] as string[],
    looking_for_summary: "",
    photos: [] as string[],
    open_to_all_ethnicities: false,
    open_to_all_countries: false,
    skip_photos: false,
  });

function toArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter(v => typeof v === 'string');
  }
  if (typeof value === "string") return [value];
  return [];
}

  
  useEffect(() => {
  const fetchProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (!data) return;

if (data) {
  if (data.onboarding_completed) {
    setIsAlreadyCompleted(true);
    navigate("/dashboard", { replace: true });
    return;
  }

  const ethnicity = toArray(data.ethnicity);
  const looking_for_ethnicity = toArray(data.looking_for_ethnicity);
  const looking_for_country = toArray(data.looking_for_country);
  const photos = toArray(data.photos);

  const processedData = {
  ...data,
  gender: data.gender || "", // ✅ NEW LINE
  ethnicity,
  looking_for_ethnicity,
  looking_for_country,
  photos,
  open_to_all_ethnicities: looking_for_ethnicity.includes("ALL"),
  open_to_all_countries: looking_for_country.includes("ALL"),
};

  // ✅ Prefill preferred country if empty and not set to "open to all"
if (
  (!processedData.looking_for_country || processedData.looking_for_country.length === 0) &&
  !processedData.open_to_all_countries &&
  processedData.country
) {
  processedData.looking_for_country = [processedData.country];
}

  setFormData(prev => ({
    ...prev,
    ...Object.fromEntries(
      Object.entries(processedData).filter(([key, value]) =>
        value !== null && key in prev
      )
    )
  }));
}
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  fetchProfileData();
}, [user, navigate]);


  const currentStepIndex = STEPS.indexOf(step || "ethnicity");
  
  useEffect(() => {
    if (!step || !STEPS.includes(step)) {
      navigate("/onboarding/ethnicity", { replace: true });
    }
  }, [step, navigate]);

  const handleNext = async () => {
    if (!validateCurrentStep()) {
  setValidationError(true);
  setTimeout(() => setValidationError(false), 1000); // remove pulse after 1s
  return;
}


    setSaveInProgress(true);
    const saveSuccess = await saveProgress();
    setSaveInProgress(false);
    
    if (!saveSuccess) {
      return;
    }

    if (currentStepIndex === STEPS.length - 1) {
      await saveProfileAndComplete();
      return;
    }

    const nextStep = STEPS[currentStepIndex + 1];
    navigate(`/onboarding/${nextStep}`);
  };

  const handlePrevious = async () => {
    if (!initialLoad) {
      setSaveInProgress(true);
      await saveProgress(false);
      setSaveInProgress(false);
    }
    
    if (currentStepIndex > 0) {
      const prevStep = STEPS[currentStepIndex - 1];
      navigate(`/onboarding/${prevStep}`);
    }
  };

  const validateCurrentStep = () => {
    switch (step) {
      case "ethnicity":
        if (formData.ethnicity.length === 0) {
          toast({
            title: "Selection required",
            description: "Please select at least one ethnicity.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "country":
        if (!formData.country) {
          toast({
            title: "Selection required",
            description: "Please select your country.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "marital-status":
        if (!formData.marital_status) {
          toast({
            title: "Selection required",
            description: "Please select your marital status.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "sect":
        if (!formData.sect) {
          toast({
            title: "Selection required",
            description: "Please select your sect.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "age":
        if (!formData.date_of_birth) {
          toast({
            title: "Date required",
            description: "Please enter your date of birth.",
            variant: "destructive",
          });
          return false;
        }
        
        const birthDate = new Date(formData.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 18) {
          toast({
            title: "Age restriction",
            description: "You must be at least 18 years old to use this service.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "height":
        if (!formData.height_cm || formData.height_cm < 147 || formData.height_cm > 213) {
          toast({
            title: "Height required",
            description: "Please select a valid height.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "weight":
        if (!formData.weight_kg || formData.weight_kg < 30 || formData.weight_kg > 150) {
          toast({
            title: "Weight required",
            description: "Please select a valid weight.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "salah":
        if (!formData.salah) {
          toast({
            title: "Selection required",
            description: "Please select your salah frequency.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "profession":
        if (!formData.profession) {
          toast({
            title: "Input required",
            description: "Please enter your profession.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "highest-education":
        if (!formData.highest_education) {
          toast({
            title: "Selection required",
            description: "Please select your highest education level.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "self-summary":
        if (!formData.self_summary) {
          toast({
            title: "Input required",
            description: "Please provide a summary about yourself.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "islamic-practices":
        if (!formData.islamic_practices) {
          toast({
            title: "Input required",
            description: "Please provide information about your Islamic practices.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "looking-for-ethnicity":
        if (!formData.open_to_all_ethnicities && formData.looking_for_ethnicity.length === 0) {
          toast({
            title: "Selection required",
            description: "Please select at least one ethnicity preference or check 'Open to all ethnicities'.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "looking-for-age":
        if (
          !formData.looking_for_age_min || 
          !formData.looking_for_age_max || 
          formData.looking_for_age_min < 18 ||
          formData.looking_for_age_max > 100 ||
          formData.looking_for_age_min > formData.looking_for_age_max
        ) {
          toast({
            title: "Valid age range required",
            description: "Please select a valid age range (minimum 18 years).",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "looking-for-height":
        if (
          !formData.looking_for_height_min || 
          !formData.looking_for_height_max || 
          formData.looking_for_height_min < 147 ||
          formData.looking_for_height_max > 213 ||
          formData.looking_for_height_min > formData.looking_for_height_max
        ) {
          toast({
            title: "Valid height range required",
            description: "Please select a valid height range.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "looking-for-country":
        if (!formData.open_to_all_countries && 
            (!formData.looking_for_country || formData.looking_for_country.length === 0)) {
          toast({
            title: "Selection required",
            description: "Please select at least one country preference or check 'Open to all countries'.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "looking-for-summary":
        if (!formData.looking_for_summary) {
          toast({
            title: "Input required",
            description: "Please describe what you're looking for in a partner.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case "photos":
        if (!formData.skip_photos && (!formData.photos || formData.photos.length === 0)) {
          toast({
            title: "Photo required",
            description: "You must upload at least one photo or choose to skip.",
            variant: "destructive",
          });
          return false;
        }
        break;
    }
    
    return true;
  };
const uploadPhotosIfNeeded = async () => {
  const uploadedPaths: string[] = [];
  
  // If skip_photos is true for female users, add placeholder image and return
  if (formData.skip_photos && formData.gender === "female") {
    return ["placeholder.jpg"];
  }
  
  // Otherwise process the photos normally
  if (Array.isArray(formData.photos)) {
    for (const photo of formData.photos) {
      if (typeof photo === "string") {
        uploadedPaths.push(photo);
      } else if (photo instanceof File) {
        const fileExt = photo.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
  
        const { error } = await supabase
          .storage
          .from('profile-pictures')
          .upload(filePath, photo);
  
        if (error) {
          toast({
            title: "Upload error",
            description: error.message,
            variant: "destructive",
          });
          return null;
        }
  
        uploadedPaths.push(filePath);
      } else {
        console.warn("Skipping invalid photo format:", photo);
      }
    }
  }

  return uploadedPaths;
};

  const saveProgress = async (showError = true) => {
    if (!user) return false;
    
    setLoading(true);
    
    try {
      console.log("Saving to database:", formData);
      
      const dataToSave: Record<string, any> = {};
      
Object.entries(formData).forEach(([key, value]) => {
  if (value === "" && !Array.isArray(value)) return;

  if (key === "looking_for_country") {
    if (formData.open_to_all_countries) {
      dataToSave[key] = ["ALL"];
      dataToSave.open_to_all_countries = true;
    } else {
      dataToSave[key] = value.length ? value : null;
      dataToSave.open_to_all_countries = false;
    }
  } else if (key === "looking_for_ethnicity") {
    if (formData.open_to_all_ethnicities) {
      dataToSave[key] = ["ALL"];
      dataToSave.open_to_all_ethnicities = true;
    } else {
      dataToSave[key] = value.length ? value : null;
      dataToSave.open_to_all_ethnicities = false;
    }
  } else if (key === "photos") {
  // We'll handle this after uploading, so skip for now
}
 else if (key === "skip_photos") {
  // Always include skip_photos in the data to save
  dataToSave[key] = value;
} else if (Array.isArray(value)) {
  dataToSave[key] = value;
} else if (value !== undefined && value !== null) {
  dataToSave[key] = value;
}

});


      if (dataToSave.marital_status && !MARITAL_STATUS.includes(dataToSave.marital_status)) {
        console.error("Invalid marital status value:", dataToSave.marital_status);
        if (showError) {
          toast({
            title: "Invalid data",
            description: "The marital status value is not valid.",
            variant: "destructive",
          });
        }
        setLoading(false);
        return false;
      }
      
      console.log("Data being saved:", dataToSave);
      const uploadedPhotos = await uploadPhotosIfNeeded();
if (!uploadedPhotos) {
  setLoading(false);
  return false;
}
dataToSave.photos = uploadedPhotos;

      const { error } = await supabase
        .from('profiles')
        .update(dataToSave)
        .eq('id', user.id);
      
      if (error) {
        console.error("Error saving progress:", error);
        if (showError) {
          toast({
            title: "Error saving progress",
            description: error.message,
            variant: "destructive",
          });
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in saveProgress:", error);
      if (showError) {
        toast({
          title: "Error",
          description: "Failed to save progress. Please try again.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveProfileAndComplete = async () => {
  if (!user) return;

  setLoading(true);

  try {
    // Upload photos before saving, handling skip_photos case
    const uploadedPhotos = await uploadPhotosIfNeeded();
    if (!uploadedPhotos) {
      setLoading(false);
      return;
    }

    const dataToSave: Record<string, any> = {
      ...formData,
      ethnicity: Array.isArray(formData.ethnicity) ? formData.ethnicity : [],
      looking_for_ethnicity: Array.isArray(formData.looking_for_ethnicity) ? formData.looking_for_ethnicity : [],
      photos: uploadedPhotos,
      skip_photos: formData.skip_photos,
      onboarding_completed: true
    };

    // Handle open_to_all fields logic
    if (formData.open_to_all_ethnicities) {
      dataToSave.looking_for_ethnicity = ["ALL"];
      dataToSave.open_to_all_ethnicities = true;
    } else {
      dataToSave.open_to_all_ethnicities = false;
    }

    if (formData.open_to_all_countries) {
      dataToSave.looking_for_country = ["ALL"];
      dataToSave.open_to_all_countries = true;
    } else {
      dataToSave.open_to_all_countries = false;
    }

    const { error } = await supabase
      .from('profiles')
      .update(dataToSave)
      .eq('id', user.id);

    if (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Failed to complete profile",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    await refreshProfile(user.id); // ⬅️ force Supabase to reload latest profile data
setOnboardingCompletedState(true);

toast({
  title: "Profile completed!",
  description: "Welcome to NikkahFirst. Your profile is now complete.",
});
     window.location.href = "/dashboard";

// Wait for user to be defined
if (user?.id) {
  await refreshProfile(user.id);
  setTimeout(() => {
    navigate("/dashboard", { replace: true });
  }, 200);
} else {
  // Fallback if user is still null — hard reload
  window.location.href = "/dashboard";
}

  } catch (error) {
    console.error("Error in saveProfileAndComplete:", error);
    setLoading(false);
  }
};


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      if (name === "looking_for_country") {
        return { ...prev, [name]: value ? [value] : [] };
      }
      if (name === "country") {
        return { ...prev, [name]: value };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleEthnicityToggle = (ethnicity: string) => {
    setFormData(prev => {
      const field = step === "looking-for-ethnicity" ? "looking_for_ethnicity" : "ethnicity";
      const currentEthnicities = Array.isArray(prev[field]) ? [...prev[field]] : [];
      
      if (currentEthnicities.includes(ethnicity)) {
        return {
          ...prev,
          [field]: currentEthnicities.filter(e => e !== ethnicity)
        };
      } else {
        return {
          ...prev,
          [field]: [...currentEthnicities, ethnicity]
        };
      }
    });
  };

  useEffect(() => {
    if (!initialLoad && step === "ethnicity" && formData.ethnicity.length > 0) {
      const saveEthnicity = async () => {
        await saveProgress(false);
      };
      saveEthnicity();
    }
  }, [formData.ethnicity, initialLoad, step]);

  const cmToFeetInches = (cm: number) => {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};


  const kgToPounds = (kg: number) => {
    return Math.round(kg * 2.20462);
  };

  const generateHeights = () => {
    const heights = [];
    for (let cm = 147; cm <= 213; cm++) {
      const inches = Math.round(cm / 2.54) % 12;
      const feet = Math.floor(Math.round(cm / 2.54) / 12);
      
      if (inches === 0 || inches < 12) {
        heights.push({
          cm,
          imperial: cmToFeetInches(cm)
        });
      }
    }
    return heights;
  };

  const generateWeights = () => {
    const weights = [];
    for (let kg = 30; kg <= 150; kg++) {
      weights.push({
        kg,
        pounds: kgToPounds(kg)
      });
    }
    return weights;
  };

  const renderStepContent = () => {
    switch (step) {
      case "ethnicity":
        return (
          <div className="space-y-4">
            <p className="text-gray-600">Select all ethnicities that apply to you:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {ETHNICITIES.map(ethnicity => (
                <Button
                  key={ethnicity}
                  type="button"
                  variant={formData.ethnicity.includes(ethnicity) ? "default" : "outline"}
                  className={`justify-start ${formData.ethnicity.includes(ethnicity) ? "bg-nikkah-pink" : ""}`}
                  onClick={() => handleEthnicityToggle(ethnicity)}
                >
                  {formData.ethnicity.includes(ethnicity) && <Check className="mr-2 h-4 w-4" />}
                  {ethnicity}
                </Button>
              ))}
            </div>
          </div>
        );
      
      case "country":
        return (
          <div className="space-y-4">
            <Label htmlFor="country">Your country of residence</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => handleSelectChange("country", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-80 overflow-y-auto">
                {COUNTRIES.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "marital-status":
        return (
          <div className="space-y-4">
            <Label htmlFor="marital_status">Marital Status</Label>
            <RadioGroup
              value={formData.marital_status}
              onValueChange={(value) => handleSelectChange("marital_status", value)}
              className="space-y-3"
            >
              {MARITAL_STATUS.map(status => (
                <div className="flex items-center space-x-2" key={status}>
                  <RadioGroupItem value={status} id={status.toLowerCase().replace(" ", "-")} />
                  <Label htmlFor={status.toLowerCase().replace(" ", "-")}>{status}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case "sect":
        return (
          <div className="space-y-4">
            <Label htmlFor="sect">Islamic Sect</Label>
            <RadioGroup
              value={formData.sect}
              onValueChange={(value) => handleSelectChange("sect", value)}
              className="space-y-3"
            >
              {SECTS.map(sect => (
                <div className="flex items-center space-x-2" key={sect}>
                  <RadioGroupItem value={sect} id={sect.toLowerCase().replace(" ", "-")} />
                  <Label htmlFor={sect.toLowerCase().replace(" ", "-")}>{sect}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case "age":
        return (
          <div className="space-y-4">
            <Label htmlFor="date_of_birth">Date of Birth (Must be 18+)</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={handleInputChange}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            />
            {formData.date_of_birth && (
              <div className="text-sm text-gray-600">
                Your age: {calculateAge(formData.date_of_birth)} years old
              </div>
            )}
          </div>
        );
      
      case "height":
        return (
          <div className="space-y-4">
            <Label htmlFor="height_cm">Your Height</Label>
            <Select
              value={formData.height_cm.toString()}
              onValueChange={(value) => handleSelectChange("height_cm", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select height" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {generateHeights().map(height => (
                  <SelectItem key={height.cm} value={height.cm.toString()}>
                    {height.imperial} ({height.cm} cm)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "weight":
        return (
          <div className="space-y-4">
            <Label htmlFor="weight_kg">Your Weight</Label>
            <Select
              value={formData.weight_kg.toString()}
              onValueChange={(value) => handleSelectChange("weight_kg", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select weight" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {generateWeights().map(weight => (
                  <SelectItem key={weight.kg} value={weight.kg.toString()}>
                    {weight.kg} kg ({weight.pounds} lbs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "salah":
        return (
          <div className="space-y-4">
            <Label htmlFor="salah">Salah Frequency</Label>
            <RadioGroup
              value={formData.salah}
              onValueChange={(value) => handleSelectChange("salah", value)}
              className="space-y-3"
            >
              {SALAH_OPTIONS.map(option => (
                <div className="flex items-center space-x-2" key={option}>
                  <RadioGroupItem value={option} id={option.toLowerCase().replace(/\s+/g, "-")} />
                  <Label htmlFor={option.toLowerCase().replace(/\s+/g, "-")}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case "profession":
        return (
          <div className="space-y-4">
            <Label htmlFor="profession">Your Profession</Label>
            <Input
              id="profession"
              name="profession"
              placeholder="e.g. Doctor, Teacher, Engineer"
              value={formData.profession}
              onChange={handleInputChange}
            />
          </div>
        );
      
      case "highest-education":
        return (
          <div className="space-y-4">
            <Label htmlFor="highest_education">Highest Education Level</Label>
            <RadioGroup
              value={formData.highest_education}
              onValueChange={(value) => handleSelectChange("highest_education", value)}
              className="space-y-3"
            >
              {EDUCATION_LEVELS.map(level => (
                <div className="flex items-center space-x-2" key={level}>
                  <RadioGroupItem value={level} id={level.toLowerCase().replace(/\s+/g, "-")} />
                  <Label htmlFor={level.toLowerCase().replace(/\s+/g, "-")}>{level}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case "self-summary":
        return (
          <div className="space-y-4">
            <Label htmlFor="self_summary">About Yourself</Label>
            <Textarea
              id="self_summary"
              name="self_summary"
              placeholder="Tell us about yourself, your interests, and what you're looking for..."
              className="min-h-[150px]"
              value={formData.self_summary}
              onChange={handleInputChange}
            />
          </div>
        );
      
      case "islamic-practices":
        return (
          <div className="space-y-4">
            <Label htmlFor="islamic_practices">Islamic Practices / Dress Code</Label>
            <Textarea
              id="islamic_practices"
              name="islamic_practices"
              placeholder="Describe your Islamic practices and dress code (e.g., hijab, beard, etc.)..."
              className="min-h-[150px]"
              value={formData.islamic_practices}
              onChange={handleInputChange}
            />
          </div>
        );
      
      case "looking-for-ethnicity":
        return (
          <div className="space-y-4">
            <p className="text-gray-600">Select ethnicities you're interested in:</p>
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="open-to-all-ethnicities"
                  checked={formData.open_to_all_ethnicities}
                  onCheckedChange={(checked) => {
  setFormData(prev => ({
    ...prev,
    open_to_all_ethnicities: checked === true,
    looking_for_ethnicity: checked === true
      ? ["ALL"]
      : prev.looking_for_ethnicity.includes("ALL")
        ? []
        : prev.looking_for_ethnicity
  }));
}}
                />
                <Label htmlFor="open-to-all-ethnicities">Open to all ethnicities</Label>
              </div>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto ${formData.open_to_all_ethnicities ? 'opacity-50 pointer-events-none' : ''}`}>
              {ETHNICITIES.map(ethnicity => (
                <Button
                  key={ethnicity}
                  type="button"
                  variant={formData.looking_for_ethnicity.includes(ethnicity) ? "default" : "outline"}
                  className={`justify-start ${formData.looking_for_ethnicity.includes(ethnicity) ? "bg-nikkah-pink" : ""}`}
                  onClick={() => handleEthnicityToggle(ethnicity)}
                >
                  {formData.looking_for_ethnicity.includes(ethnicity) && <Check className="mr-2 h-4 w-4" />}
                  {ethnicity}
                </Button>
              ))}
            </div>
          </div>
        );
      
      case "looking-for-age":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Preferred Age Range (years)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="looking_for_age_min" className="text-xs text-muted-foreground">Minimum Age</Label>
                  <Select
                    value={formData.looking_for_age_min.toString()}
                    onValueChange={(value) => handleSelectChange("looking_for_age_min", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Min age" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 83 }, (_, i) => i + 18).map(age => (
                        <SelectItem key={`min-${age}`} value={age.toString()}>{age}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="looking_for_age_max" className="text-xs text-muted-foreground">Maximum Age</Label>
                  <Select
                    value={formData.looking_for_age_max.toString()}
                    onValueChange={(value) => handleSelectChange("looking_for_age_max", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Max age" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 83 }, (_, i) => i + 18).map(age => (
                        <SelectItem key={`max-${age}`} value={age.toString()}>{age}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "looking-for-height":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Preferred Height Range</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="looking_for_height_min" className="text-xs text-muted-foreground">Minimum Height</Label>
                  <Select
                    value={formData.looking_for_height_min.toString()}
                    onValueChange={(value) => handleSelectChange("looking_for_height_min", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Min height" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {generateHeights().map(height => (
                        <SelectItem key={`min-${height.cm}`} value={height.cm.toString()}>
                          {height.imperial} ({height.cm} cm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="looking_for_height_max" className="text-xs text-muted-foreground">Maximum Height</Label>
                  <Select
                    value={formData.looking_for_height_max.toString()}
                    onValueChange={(value) => handleSelectChange("looking_for_height_max", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Max height" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {generateHeights().map(height => (
                        <SelectItem key={`max-${height.cm}`} value={height.cm.toString()}>
                          {height.imperial} ({height.cm} cm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "looking-for-country":
        return (
          <div className="space-y-4">
            <Label htmlFor="looking_for_country">Preferred Country of Residence</Label>
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="open-to-all-countries"
                  checked={formData.open_to_all_countries}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      open_to_all_countries: checked === true,
                      looking_for_country: checked === true ? ["ALL"] : prev.looking_for_country
                    }));
                  }}
                />
                <Label htmlFor="open-to-all-countries">Open to all countries</Label>
              </div>
            </div>
            <div className={formData.open_to_all_countries ? 'opacity-50 pointer-events-none' : ''}>
              <Select
                value={formData.looking_for_country && formData.looking_for_country.length ? formData.looking_for_country[0] : ""}
                onValueChange={(value) => handleSelectChange("looking_for_country", value)}
                disabled={formData.open_to_all_countries}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-80 overflow-y-auto">
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case "looking-for-summary":
        return (
          <div className="space-y-4">
            <Label htmlFor="looking_for_summary">What You're Looking For</Label>
            <Textarea
              id="looking_for_summary"
              name="looking_for_summary"
              placeholder="Describe the type of person you're looking for..."
              className="min-h-[150px]"
              value={formData.looking_for_summary}
              onChange={handleInputChange}
            />
          </div>
        );
      
      case "photos":
        return (
          <div className="space-y-4">
            {formData.gender === "female" && (
              <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm p-4 rounded-md">
                <strong>Note for sisters:</strong> Your photos will remain <strong>blurred and hidden</strong>. They'll only be shown to brothers you've <strong>matched with</strong> or <strong>sent a request to</strong>.
              </div>
            )}

            {formData.gender === "female" && (
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="skip_photos"
                  checked={formData.skip_photos}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      skip_photos: checked === true,
                      photos: checked === true ? [] : prev.photos,
                    }));
                  }}
                />
                <Label htmlFor="skip_photos" className="text-sm">
                  I prefer not to upload photos
                </Label>
              </div>
            )}

            {!formData.skip_photos && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Let others see what you look like. Upload at least one photo for your profile.
                    <br />
                    <strong>Note:</strong> You must upload at least one photo to complete your profile.
                  </p>
                </div>

                <ImageUpload
                  images={formData.photos}
                  onChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
                  enforceMinImages={true}
                  minImages={1}
                  maxImages={4}
                  isOnboarding={true}
                />
              </>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "ethnicity": return "Your Ethnicity";
      case "country": return "Your Country";
      case "marital-status": return "Marital Status";
      case "sect": return "Islamic Sect";
      case "age": return "Your Age";
      case "height": return "Your Height";
      case "weight": return "Your Weight";
      case "salah": return "Salah Practice";
      case "profession": return "Your Profession";
      case "highest-education": return "Education Level";
      case "self-summary": return "About Yourself";
      case "islamic-practices": return "Islamic Practices";
      case "looking-for-ethnicity": return "Preferred Ethnicities";
      case "looking-for-age": return "Preferred Age Range";
      case "looking-for-height": return "Preferred Height Range";
      case "looking-for-country": return "Preferred Country";
      case "looking-for-summary": return "What You're Looking For";
      case "photos": return "Upload Photos";
      default: return "Complete Your Profile";
    }
  };

  if (isAlreadyCompleted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      
      <main className="flex-1 flex items-center justify-center py-8 px-4 hero-pattern">
        <Card className="w-full max-w-xl shadow-lg border-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Heart className="h-10 w-10 fill-nikkah-pink text-nikkah-pink" />
            </div>
            <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
            <div className="w-full bg-gray-200 h-2 rounded-full mt-6">
              <div 
                className="bg-nikkah-pink h-2 rounded-full" 
                style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Step {currentStepIndex + 1} of {STEPS.length}
            </div>
          </CardHeader>
          
          <CardContent className={validationError ? "animate-pulse ring-2 ring-red-400 rounded-md" : ""}>
  {renderStepContent()}
</CardContent>

          
          <CardFooter className="flex justify-between">
            <Button
              onClick={handlePrevious}
              variant="outline"
              disabled={currentStepIndex === 0 || loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            
            <Button
              onClick={handleNext}
              className="bg-nikkah-pink hover:bg-nikkah-pink/90"
              disabled={loading || saveInProgress}
            >
              {loading ? "Saving..." : currentStepIndex === STEPS.length - 1 ? (
                <>Complete Profile <Check className="ml-2 h-4 w-4" /></>
              ) : (
                <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Onboarding;
