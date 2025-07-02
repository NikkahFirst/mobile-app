
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  User, 
  MapPin, 
  Calendar, 
  School, 
  Briefcase, 
  Ruler, 
  Weight, 
  Heart,
  BookOpenText,
  Edit,
  Save,
  X,
  Check,
  Loader2,
  ImageIcon,
  UserCircle,
  Users,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateProfileData, getSignedPhotoUrl } from "@/lib/supabaseClient";
import { updateProfile, getProfileById } from "@/integrations/supabase/client";

import { getEthnicityFlag } from '@/lib/ethnicityFlags';
import { supabase } from "@/integrations/supabase/client"; 


// Define the interface for ProfileCV component props
interface ProfileCVProps {
  onPhotoClick?: (photo: string) => void;
  onProfileUpdated?: () => void;
}

const ETHNICITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Antiguans", "Argentinean", 
  "Armenian", "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", 
  "Barbadian", "Barbudans", "Batswana", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", 
  "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkina", "Burundian", 
  "Cambodian", "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", 
  "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", 
  "Cypriot", "Czech", "Danish", "Djibouti", "Dominican", "Dutch", "East Timorese", "Ecuadorean", 
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
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", 
  "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", 
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", 
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar, {Burma}", "Namibia", "Nauru", 
  "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", 
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", 
  "Poland", "Portugal", "Qatar", "Romania", "Russian Federation", "Rwanda", "St Kitts & Nevis", 
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

const cmToFeetInches = (cm: number) => {
  const inches = cm / 2.54;
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${feet}'${remainingInches}"`;
};

const kgToPounds = (kg: number) => {
  return Math.round(kg * 2.20462);
};

const generateHeights = () => {
  const heights = [];
  for (let cm = 147; cm <= 213; cm++) {
    const inches = Math.round(cm / 2.54) % 12;
    const feet = Math.floor(Math.round(cm / 2.54) / 12);
    
    if (inches === 12) continue;
    
    heights.push({
      cm,
      imperial: cmToFeetInches(cm)
    });
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

const calculateAge = (dateOfBirth: string) => {
  if (!dateOfBirth) return null;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};



const ProfileCV = ({
  onPhotoClick = () => {},
  onProfileUpdated = () => {}
}: ProfileCVProps) => {
  const [openToAllEthnicities, setOpenToAllEthnicities] = useState(false);
  const [openToAllCountries, setOpenToAllCountries] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  type SignedPhoto = {
  url: string;
  loading?: boolean;
  path?: string;
  tempId?: string;
};

const [signedPhotos, setSignedPhotos] = useState<SignedPhoto[]>([]);

  const [selectedPreferredEthnicities, setSelectedPreferredEthnicities] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
const handlePhotoUpload = async (files: File[]) => {
  if (!user || !files.length) return;

  for (const file of files) {
    if (!file) continue;

    const tempId = `temp-${Date.now()}`;

    // Immediately add loading photo to UI
    setSignedPhotos(prev => [...prev, { url: '', loading: true, tempId }]);

    try {
      const filePath = `${user.id}/${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (error) {
        console.error("Error uploading file:", error.message);
        setSignedPhotos(prev => prev.filter(p => p.tempId !== tempId));
        continue;
      }

      if (data?.path) {
        const signedUrl = await getSignedPhotoUrl(data.path);

        if (signedUrl) {
          // Replace temp placeholder with real uploaded photo
          setSignedPhotos(prev => prev.map(photo => 
            photo.tempId === tempId 
              ? { url: signedUrl, loading: false, path: data.path }
              : photo
          ));

          // Also update formData.photos (this is critical!)
          setFormData(prev => ({
            ...prev,
            photos: [...(prev.photos || []), data.path]
          }));
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setSignedPhotos(prev => prev.filter(p => p.tempId !== tempId));
    }
  }
};





const handleDeletePhoto = async (index: number) => {
  if (index < 0) return;

  if (signedPhotos.length <= 1) {
    toast({
      title: "At least one photo required",
      description: "You must have at least one photo on your profile.",
      variant: "destructive"
    });
    return;
  }

  const signedPhoto = signedPhotos[index];
  if (!signedPhoto) return;

  // Remove from signedPhotos array
  setSignedPhotos(prev => prev.filter((_, i) => i !== index));

  // Remove from formData.photos (path only)
  if (signedPhoto.path) {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter(p => p !== signedPhoto.path)
    }));

    // Optional: Delete from storage
    const { error } = await supabase.storage
      .from('profile-pictures')
      .remove([signedPhoto.path]);
    
    if (error) {
      console.error("Error deleting photo from storage:", error.message);
    }
  }
};




const handleReplacePhoto = async (index: number, newFile: File) => {
  if (!user) return;
  
  const filePath = `profile-photos/${user.id}/${Date.now()}-${newFile.name}`;
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(filePath, newFile);

  if (error) {
    console.error("Error replacing photo:", error.message);
    return;
  }

  const updatedPhotos = [...formData.photos];
  updatedPhotos[index] = data.path;

  setFormData((prev: any) => ({
    ...prev,
    photos: updatedPhotos
  }));

  const newSignedUrl = await getSignedPhotoUrl(data.path);
  const updatedSignedPhotos = [...signedPhotos];
  updatedSignedPhotos[index] = newSignedUrl || "";

  setSignedPhotos(updatedSignedPhotos);
};

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log("Fetching profile data for user:", user.id);
        const { data, error } = await getProfileById(user.id);
        
        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: "Error",
            description: "Could not load profile data",
            variant: "destructive"
          });
          return;
        }
        
        if (data) {
  console.log("Profile data retrieved:", data);
  setProfile(data);
  setFormData(data);
          // Ensure photos array only contains paths, not full URLs
if (data?.photos?.length) {
  const cleanedPhotos = data.photos.map((photo: string) => {
    // If it's a full URL, extract just the path
    if (photo.startsWith('https://')) {
      const parts = photo.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        return parts[1]; // Get the path after "public/"
      }
    }
    return photo; // Otherwise keep as is
  });

  data.photos = cleanedPhotos;
}

  setSelectedEthnicities(Array.isArray(data.ethnicity) ? data.ethnicity : []);
  setSelectedPreferredEthnicities(Array.isArray(data.looking_for_ethnicity) ? data.looking_for_ethnicity : []);
  setOpenToAllEthnicities(data.looking_for_ethnicity?.includes("ALL") || false);
  setOpenToAllCountries(data.looking_for_country?.includes("ALL") || false);


        } else {
          console.log("No profile data returned");
        }
      } catch (error) {
        console.error("Exception in fetchProfile:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, toast]);
  
useEffect(() => {
  const fetchSignedPhotos = async () => {
    if (profile?.photos) {
      const signedUrls = await Promise.all(
        profile.photos.map(async (path: string) => {
          const url = await getSignedPhotoUrl(path);
          return url ? { url, path, loading: false } : null;
        })
      );
      setSignedPhotos(signedUrls.filter(Boolean) as SignedPhoto[]);
    }
  };

  fetchSignedPhotos();
}, [profile]);


  
  const handleFormChange = useCallback((name: string, value: any) => {
    console.log(`Form field changed: ${name} = `, value);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleEthnicityToggle = useCallback((ethnicity: string, isPreference: boolean = false) => {
    if (isPreference) {
      const newEthnicities = selectedPreferredEthnicities.includes(ethnicity)
        ? selectedPreferredEthnicities.filter(e => e !== ethnicity)
        : [...selectedPreferredEthnicities, ethnicity];
      
      console.log("Updated preferred ethnicities:", newEthnicities);
      setSelectedPreferredEthnicities(newEthnicities);
      handleFormChange('looking_for_ethnicity', newEthnicities);
    } else {
      const newEthnicities = selectedEthnicities.includes(ethnicity)
        ? selectedEthnicities.filter(e => e !== ethnicity)
        : [...selectedEthnicities, ethnicity];
      
      console.log("Updated ethnicities:", newEthnicities);
      setSelectedEthnicities(newEthnicities);
      handleFormChange('ethnicity', newEthnicities);
    }
  }, [selectedPreferredEthnicities, selectedEthnicities, handleFormChange]);

  const handleSaveAllChanges = async () => {
    if (!user) {
      console.error("No user found when attempting to save profile");
      return;
    }
    
    setSaving(true);
    setValidationErrors({});
    
    try {
      console.log("Starting profile save with form data:", formData);
      
      const updatedData = {
        ...formData,
        ethnicity: selectedEthnicities,
        looking_for_ethnicity: selectedPreferredEthnicities,
      };
      if (openToAllEthnicities) {
  updatedData.looking_for_ethnicity = ['ALL'];
}
if (openToAllCountries) {
  updatedData.looking_for_country = ['ALL'];
}
      
      if (updatedData.height_cm) updatedData.height_cm = Number(updatedData.height_cm);
      if (updatedData.weight_kg) updatedData.weight_kg = Number(updatedData.weight_kg);
      if (updatedData.looking_for_age_min) updatedData.looking_for_age_min = Number(updatedData.looking_for_age_min);
      if (updatedData.looking_for_age_max) updatedData.looking_for_age_max = Number(updatedData.looking_for_age_max);
      if (updatedData.looking_for_height_min) updatedData.looking_for_height_min = Number(updatedData.looking_for_height_min);
      if (updatedData.looking_for_height_max) updatedData.looking_for_height_max = Number(updatedData.looking_for_height_max);
      
      console.log("Processed data for validation:", updatedData);
      
      const { isValid, errors } = validateProfileData(updatedData);
      // Extra required fields validation
const requiredFields = [
  'date_of_birth',
  'marital_status',
  'country',
  'ethnicity',
  'height_cm',
  'weight_kg',
  'self_summary',
  'sect',
  'salah',
  'islamic_practices',
  'highest_education',
  'profession',
  'looking_for_age_min',
  'looking_for_age_max',
  'looking_for_height_min',
  'looking_for_height_max',
  'looking_for_summary',
];

const missingFields = requiredFields.filter((field) => {
  const value = updatedData[field];

  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return value === undefined || value === null || value === '';
});

// Photos must also have at least one image
if (!updatedData.photos || !Array.isArray(updatedData.photos) || updatedData.photos.length === 0) {
  missingFields.push('photos');
}

if (missingFields.length > 0) {
  toast({
    title: "Missing Information",
    description: `Please fill in all required fields before saving.`,
    variant: "destructive"
  });
  setSaving(false);
  return;
}

      
      if (!isValid) {
        console.error("Validation errors:", errors);
        setValidationErrors(errors);
        const firstError = Object.values(errors)[0];
        toast({
          title: "Invalid data",
          description: firstError,
          variant: "destructive"
        });
        setSaving(false);
        return;
      }
      
      console.log("Calling updateProfile with data:", updatedData);
      const { error } = await updateProfile(user.id, updatedData);
      
      if (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Error",
          description: error.message || "Could not update profile",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Profile updated successfully");
      setProfile(updatedData);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      onProfileUpdated();
      
      setIsEditing(false);
    } catch (error) {
      console.error("Exception in handleSaveAllChanges:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEditMode = () => {
  if (isEditing) {
    // Cancel edits → revert form and photos
    setFormData(profile);
    setSelectedEthnicities(Array.isArray(profile.ethnicity) ? profile.ethnicity : []);
    setSelectedPreferredEthnicities(Array.isArray(profile.looking_for_ethnicity) ? profile.looking_for_ethnicity : []);
    setValidationErrors({});

    // FULL RESET of photos from profile
    const fetchSigned = async () => {
      if (profile?.photos) {
        const signedUrls = await Promise.all(
          profile.photos.map(async (path: string) => {
            const url = await getSignedPhotoUrl(path);
            return url ? { url, path, loading: false } : null;
          })
        );
        setSignedPhotos(signedUrls.filter(Boolean) as SignedPhoto[]);
      } else {
        setSignedPhotos([]);
      }
    };

    fetchSigned();
  }

  setIsEditing(!isEditing);
};



  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-nikkah-pink" />
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was an issue loading your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  

  const renderPhotoGrid = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {signedPhotos.map((photo, index) => (
        <div key={photo.path || photo.tempId || index} className="aspect-square rounded-md overflow-hidden border relative">
          <SignedImage photo={photo} index={index} onPhotoClick={onPhotoClick} />
          {isEditing && (
            <button
              onClick={() => handleDeletePhoto(index)}
              className="absolute top-2 right-2 bg-white rounded-full p-1"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      ))}

      {/* Add Upload Button if editing and less than 4 photos */}
      {isEditing && signedPhotos.length < 4 && (
        <label className="aspect-square flex items-center justify-center rounded-md border border-dashed border-gray-300 cursor-pointer hover:bg-gray-100">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                handlePhotoUpload(Array.from(e.target.files));
              }
            }}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-6 w-6 mb-1" />
            <span className="text-sm">Upload</span>
          </div>
        </label>
      )}
    </div>
  );
};


const SignedImage = ({ photo, index, onPhotoClick }: { photo: SignedPhoto, index: number, onPhotoClick: (url: string) => void }) => {
  if (photo.loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-200 animate-pulse rounded-md">
        <Loader2 className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <img 
      src={photo.url}
      alt={`Profile ${index + 1}`} 
      className="w-full h-full object-cover cursor-pointer"
      onClick={() => onPhotoClick(photo.url)}
    />
  );
};





  
  return (
    <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">

        <h1 className="text-3xl font-bold">My Profile</h1>
        {isEditing ? (
          <div className="flex gap-2">
            <Button 
              onClick={toggleEditMode}
              variant="outline"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAllChanges} 
              className="bg-nikkah-pink hover:bg-nikkah-pink/90"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save All Changes
            </Button>
          </div>
        ) : (
          <Button 
            onClick={toggleEditMode} 
            className="bg-nikkah-pink hover:bg-nikkah-pink/90"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCircle className="mr-2 h-5 w-5 text-nikkah-pink" />
            Display Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <div className="mt-1">
                  <Input
                    id="display_name"
                    value={formData.display_name || ''}
                    onChange={(e) => handleFormChange('display_name', e.target.value)}
                    placeholder="Enter a display name"
                    className="w-full md:w-1/2"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This is how other users will see you on the platform. If not set, you will appear as "Anonymous".
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start">
                <UserCircle className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-medium">Display Name</h3>
                  {profile.display_name ? (
                    <p className="text-gray-600">{profile.display_name}</p>
                  ) : (
                    <p className="text-gray-400">Not set (you will appear as "Anonymous" to others)</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
  <CardHeader>
    <CardTitle className="flex items-center">
      <ImageIcon className="mr-2 h-5 w-5 text-nikkah-pink" />
      Profile Photos
    </CardTitle>
  </CardHeader>
  <CardContent>
    {renderPhotoGrid()}
  </CardContent>
</Card>



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5 text-nikkah-pink" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => handleFormChange('date_of_birth', e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Marital Status</Label>
                  <RadioGroup
                    value={formData.marital_status || ''}
                    onValueChange={(value) => handleFormChange('marital_status', value)}
                    className="mt-2"
                  >
                    {MARITAL_STATUS.map(status => (
                      <div className="flex items-center space-x-2" key={status}>
                        <RadioGroupItem value={status} id={`marital-${status.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label htmlFor={`marital-${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <Label>Country</Label>
                  <Select 
                    value={formData.country || ''} 
                    onValueChange={(value) => handleFormChange('country', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 overflow-y-auto">
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ethnicity</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-md p-2 mt-1">
                    {ETHNICITIES.map(ethnicity => (
                      <Button
                        key={ethnicity}
                        type="button"
                        variant={selectedEthnicities.includes(ethnicity) ? "default" : "outline"}
                        className={`justify-start text-sm h-8 ${selectedEthnicities.includes(ethnicity) ? "bg-nikkah-pink" : ""}`}
                        onClick={() => handleEthnicityToggle(ethnicity, false)}
                      >
                        {selectedEthnicities.includes(ethnicity) && <Check className="mr-1 h-3 w-3" />}
                        {ethnicity}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Height</Label>
                  <Select 
                    value={formData.height_cm?.toString() || ''} 
                    onValueChange={(value) => handleFormChange('height_cm', value)}
                  >
                    <SelectTrigger className="mt-1">
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
                
                <div>
                  <Label>Weight</Label>
                  <Select 
                    value={formData.weight_kg?.toString() || ''} 
                    onValueChange={(value) => handleFormChange('weight_kg', value)}
                  >
                    <SelectTrigger className="mt-1">
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
              </div>
              
              <div>
                <Label>About Me</Label>
                <Textarea
                  className="mt-2 min-h-[150px]"
                  value={formData.self_summary || ''}
                  onChange={(e) => handleFormChange('self_summary', e.target.value)}
                  placeholder="Tell others about yourself, your interests, and what makes you unique..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Date of Birth</h3>
                    {profile.date_of_birth ? (
                      <p className="text-gray-600">
                        {new Date(profile.date_of_birth).toLocaleDateString()} 
                        <span className="ml-2 text-sm text-gray-500">
                          ({calculateAge(profile.date_of_birth)} years old)
                        </span>
                      </p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Heart className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Marital Status</h3>
                    {profile.marital_status ? (
                      <p className="text-gray-600">{profile.marital_status}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Country</h3>
                    {profile.country ? (
                      <p className="text-gray-600">{profile.country}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <Globe className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Ethnicity</h3>
                    {profile.ethnicity && profile.ethnicity.length > 0 ? (
                      <div className="text-gray-600">
                        {Array.isArray(profile.ethnicity) 
                          ? profile.ethnicity.map((eth: string, index: number) => (
                            <span key={index}>
                              {eth}{getEthnicityFlag(eth)}
                              {index < profile.ethnicity.length - 1 ? ', ' : ''}
                            </span>
                          ))
                          : profile.ethnicity}
                      </div>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Ruler className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Height</h3>
                    {profile.height_cm ? (
                      <p className="text-gray-600">{cmToFeetInches(profile.height_cm)} ({profile.height_cm} cm)</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Weight className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Weight</h3>
                    {profile.weight_kg ? (
                      <p className="text-gray-600">{profile.weight_kg} kg ({kgToPounds(profile.weight_kg)} lbs)</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Separator className="my-4" />
                <div>
                  <h3 className="font-medium">About Me</h3>
                  {profile.self_summary ? (
                    <p className="text-gray-600 whitespace-pre-line mt-2">{profile.self_summary}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpenText className="mr-2 h-5 w-5 text-nikkah-pink" />
            Islamic Background
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Islamic Sect</Label>
                  <RadioGroup
                    value={formData.sect || ''}
                    onValueChange={(value) => handleFormChange('sect', value)}
                    className="mt-2"
                  >
                    {SECTS.map(sect => (
                      <div className="flex items-center space-x-2" key={sect}>
                        <RadioGroupItem value={sect} id={`sect-${sect.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label htmlFor={`sect-${sect.toLowerCase().replace(/\s+/g, "-")}`}>{sect}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <Label>Salah Frequency</Label>
                  <RadioGroup
                    value={formData.salah || ''}
                    onValueChange={(value) => handleFormChange('salah', value)}
                    className="mt-2"
                  >
                    {SALAH_OPTIONS.map(option => (
                      <div className="flex items-center space-x-2" key={option}>
                        <RadioGroupItem value={option} id={`salah-${option.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label htmlFor={`salah-${option.toLowerCase().replace(/\s+/g, "-")}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
              
              <div>
                <Label>Islamic Practices / Dress Code</Label>
                <Textarea
                  className="mt-2 min-h-[150px]"
                  value={formData.islamic_practices || ''}
                  onChange={(e) => handleFormChange('islamic_practices', e.target.value)}
                  placeholder="Describe your Islamic practices, dress code (e.g., hijab, beard), etc..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Islamic Sect</h3>
                    {profile.sect ? (
                      <p className="text-gray-600">{profile.sect}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Salah Frequency</h3>
                    {profile.salah ? (
                      <p className="text-gray-600">{profile.salah}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Separator className="my-4" />
                <div>
                  <h3 className="font-medium">Islamic Practices / Dress Code</h3>
                  {profile.islamic_practices ? (
                    <p className="text-gray-600 whitespace-pre-line mt-2">{profile.islamic_practices}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-nikkah-pink" />
            Education & Career
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Highest Education</Label>
                  <Select 
                    value={formData.highest_education || ''} 
                    onValueChange={(value) => handleFormChange('highest_education', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={formData.profession || ''}
                    onChange={(e) => handleFormChange('profession', e.target.value)}
                    placeholder="Enter your profession"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <School className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Highest Education</h3>
                    {profile.highest_education ? (
                      <p className="text-gray-600">{profile.highest_education}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="font-medium">Profession</h3>
                    {profile.profession ? (
                      <p className="text-gray-600">{profile.profession}</p>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-nikkah-pink" />
            Partner Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Age</Label>
                  <Input
                    type="number"
                    min={18}
                    max={80}
                    value={formData.looking_for_age_min || ''}
                    onChange={(e) => handleFormChange('looking_for_age_min', e.target.value)}
                    placeholder="Min age"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Maximum Age</Label>
                  <Input
                    type="number"
                    min={18}
                    max={80}
                    value={formData.looking_for_age_max || ''}
                    onChange={(e) => handleFormChange('looking_for_age_max', e.target.value)}
                    placeholder="Max age"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Minimum Height</Label>
                  <Select 
                    value={formData.looking_for_height_min?.toString() || ''} 
                    onValueChange={(value) => handleFormChange('looking_for_height_min', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select min height" />
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
                
                <div>
                  <Label>Maximum Height</Label>
                  <Select 
                    value={formData.looking_for_height_max?.toString() || ''} 
                    onValueChange={(value) => handleFormChange('looking_for_height_max', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select max height" />
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
                
                <div>
  <Label>Preferred Country</Label>

  <div className="flex items-center space-x-2 mb-2">
    <input
      type="checkbox"
      id="open-to-all-countries"
      checked={openToAllCountries}
      onChange={(e) => {
        const checked = e.target.checked;
        setOpenToAllCountries(checked);
        handleFormChange('looking_for_country', checked ? ['ALL'] : []);
      }}
    />
    <Label htmlFor="open-to-all-countries">Open to all countries</Label>
  </div>

  <Select 
  value={
    openToAllCountries || !Array.isArray(formData.looking_for_country)
      ? ''
      : formData.looking_for_country[0] || ''
  }
  onValueChange={(value) =>
    handleFormChange('looking_for_country', value ? [value] : [])
  }
  disabled={openToAllCountries}
>

    <SelectTrigger className="mt-1">
      <SelectValue placeholder="Select country" />
    </SelectTrigger>
    <SelectContent className="max-h-80 overflow-y-auto">
      {COUNTRIES.map(country => (
        <SelectItem key={country} value={country}>{country}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

                
                <div>
  <Label>Preferred Ethnicity</Label>

  <div className="flex items-center space-x-2 mb-2">
    <input
      type="checkbox"
      id="open-to-all-ethnicities"
      checked={openToAllEthnicities}
      onChange={(e) => {
        const checked = e.target.checked;
        setOpenToAllEthnicities(checked);
        handleFormChange('looking_for_ethnicity', checked ? ['ALL'] : selectedPreferredEthnicities);
      }}
    />
    <Label htmlFor="open-to-all-ethnicities">Open to all ethnicities</Label>
  </div>

  <div className={`grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-md p-2 mt-1 ${openToAllEthnicities ? 'opacity-50 pointer-events-none' : ''}`}>
    {ETHNICITIES.map(ethnicity => (
      <Button
        key={ethnicity}
        type="button"
        variant={selectedPreferredEthnicities.includes(ethnicity) ? "default" : "outline"}
        className={`justify-start text-sm h-8 ${selectedPreferredEthnicities.includes(ethnicity) ? "bg-nikkah-pink" : ""}`}
        onClick={() => handleEthnicityToggle(ethnicity, true)}
      >
        {selectedPreferredEthnicities.includes(ethnicity) && <Check className="mr-1 h-3 w-3" />}
        {ethnicity}
      </Button>
    ))}
  </div>
</div>

              </div>
              
              <div>
                <Label>Partner Preferences Description</Label>
                <Textarea
                  className="mt-2 min-h-[150px]"
                  value={formData.looking_for_summary || ''}
                  onChange={(e) => handleFormChange('looking_for_summary', e.target.value)}
                  placeholder="Describe what you're looking for in a partner beyond the above criteria..."
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Age Range</h3>
                    {profile.looking_for_age_min || profile.looking_for_age_max ? (
                      <p className="text-gray-600">
                        {profile.looking_for_age_min ? `${profile.looking_for_age_min}` : 'Any'} to {profile.looking_for_age_max ? `${profile.looking_for_age_max}` : 'Any'} years
                      </p>
                    ) : (
                      <p className="text-gray-400">Not specified</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Height Range</h3>
                    {profile.looking_for_height_min || profile.looking_for_height_max ? (
                      <p className="text-gray-600">
                        {profile.looking_for_height_min ? `${cmToFeetInches(profile.looking_for_height_min)} (${profile.looking_for_height_min} cm)` : 'Any'} to {profile.looking_for_height_max ? `${cmToFeetInches(profile.looking_for_height_max)} (${profile.looking_for_height_max} cm)` : 'Any'}
                      </p>
                    ) : (
                      <p className="text-gray-400">Not specified</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Preferred Country</h3>
                    {profile.looking_for_country ? (
                      <p className="text-gray-600">{profile.looking_for_country}</p>
                    ) : (
                      <p className="text-gray-400">Not specified</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div>
                    <h3 className="font-medium">Preferred Ethnicity</h3>
                    {profile.looking_for_ethnicity && profile.looking_for_ethnicity.length > 0 ? (
                      <div className="text-gray-600">
                        {Array.isArray(profile.looking_for_ethnicity) 
                          ? profile.looking_for_ethnicity.map((eth: string, index: number) => (
                            <span key={index}>
                              {eth}{getEthnicityFlag(eth)}
                              {index < profile.looking_for_ethnicity.length - 1 ? ', ' : ''}
                            </span>
                          ))
                          : profile.looking_for_ethnicity}
                      </div>
                    ) : (
                      <p className="text-gray-400">Not specified</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Separator className="my-4" />
                <div>
                  <h3 className="font-medium">Partner Preferences Description</h3>
                  {profile.looking_for_summary ? (
                    <p className="text-gray-600 whitespace-pre-line mt-2">{profile.looking_for_summary}</p>
                  ) : (
                    <p className="text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCV;
