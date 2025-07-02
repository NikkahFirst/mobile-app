
import { useState, useEffect } from "react";
import { PlusCircle, X, ImageIcon, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";

interface ImageUploadProps {
  images: string[];
  onChange: (files: string[]) => void;
  maxImages?: number;
  minImages?: number;
  enforceMinImages?: boolean;
  isOnboarding?: boolean;
}

const ImageUpload = ({ 
  images = [], 
  onChange, 
  maxImages = 4, 
  minImages = 1,
  enforceMinImages = true,
  isOnboarding = false
}: ImageUploadProps) => {
  const { user } = useAuth();
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  const [uploadingIndexes, setUploadingIndexes] = useState<number[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();

  useEffect(() => {
    const fetchSignedUrls = async () => {
      const urls = await Promise.all(images.map(async (img, index) => {
        if (img.startsWith("http")) {
          return img; // already a full URL
        } else {
          try {
            const { data, error } = await supabase.storage
              .from('profile-pictures')
              .createSignedUrl(img, 60 * 60); // 1 hour valid
            
            if (error) {
              console.error("Error creating signed URL for image", index, ":", error.message);
              return "";
            }
            return data?.signedUrl || "";
          } catch (err) {
            console.error("Exception creating signed URL for image", index, ":", err);
            return "";
          }
        }
      }));

      setDisplayImages(urls.filter(Boolean));
    };

    fetchSignedUrls();
  }, [images]);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user?.id) {
      const errorMsg = "User not authenticated. Please log in again.";
      setUploadError(errorMsg);
      showErrorMessage(errorMsg);
      return null;
    }

    // Validate file size (5MB limit for mobile, 10MB for desktop)
    const maxSizeMB = isMobile ? 5 : 10;
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = `File too large. Maximum size is ${maxSizeMB}MB.`;
      setUploadError(errorMsg);
      showErrorMessage(errorMsg);
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = "Invalid file type. Only JPEG, PNG, GIF, and WEBP are supported.";
      setUploadError(errorMsg);
      showErrorMessage(errorMsg);
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log(`Uploading file: ${filePath}, size: ${file.size / 1024 / 1024}MB, type: ${file.type}, device: ${isMobile ? 'mobile' : 'desktop'}`);

      const { error, data } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Upload error:", error.message);
        setUploadError(error.message);
        showErrorMessage(`Upload failed: ${error.message}`);
        return null;
      }

      console.log("Upload successful:", filePath);
      setUploadError(null);
      return filePath;
    } catch (err: any) {
      console.error("Exception during upload:", err.message);
      setUploadError(err.message);
      showErrorMessage(`Upload error: ${err.message}`);
      return null;
    }
  };

  const showErrorMessage = (message: string) => {
    if (isMobile) {
      showNotification(message, "error");
    } else {
      toast({
        title: "Upload Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const showSuccessMessage = (message: string) => {
    if (isMobile) {
      showNotification(message, "success");
    } else {
      toast({
        title: "Success",
        description: message,
      });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const filesArray = Array.from(e.target.files);
    const newImageIndex = images.length;
    
    // Add loading state
    setUploadingIndexes(prev => [...prev, newImageIndex]);
    
    // Upload the first file immediately - we'll only handle one at a time for simplicity
    const file = filesArray[0];
    const uploadedPath = await uploadFile(file);
    
    // Remove loading state
    setUploadingIndexes(prev => prev.filter(idx => idx !== newImageIndex));
    
    if (uploadedPath) {
      // If upload successful, add the path to the images array
      onChange([...images, uploadedPath]);
      showSuccessMessage("Photo uploaded successfully!");
    }
    
    e.target.value = ''; // Reset input after upload
  };

  const handleRemove = async (index: number) => {
    try {
      const path = images[index];
      
      // If path is a storage path (not a URL), delete from storage
      if (path && !path.startsWith("http")) {
        const { error } = await supabase.storage
          .from('profile-pictures')
          .remove([path]);
        
        if (error) {
          console.error("Error removing file:", error.message);
        }
      }
      
      // Remove from local state regardless of deletion success
      const newImages = [...images];
      newImages.splice(index, 1);
      onChange(newImages);
    } catch (error) {
      console.error("Error in handleRemove:", error);
    }
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="bg-red-50 border border-red-300 text-red-800 text-sm p-4 rounded-md mb-4">
          {uploadError}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {displayImages.map((url, index) => (
          <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
            <img 
              src={url} 
              alt={`Upload ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-70 transition-colors"
              disabled={uploadingIndexes.length > 0}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        
        {uploadingIndexes.map((_, idx) => (
          <div key={`loading-${idx}`} className="relative aspect-square rounded-md overflow-hidden border flex items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ))}
        
        {images.length + uploadingIndexes.length < maxImages && (
          <label className={`cursor-pointer flex items-center justify-center border border-dashed rounded-md aspect-square hover:bg-gray-50 transition-colors ${uploadingIndexes.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex flex-col items-center text-gray-500">
              <PlusCircle className="h-8 w-8 mb-2" />
              <span className="text-xs text-center">Add Photo</span>
            </div>

            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploadingIndexes.length > 0}
            />
          </label>
        )}
      </div>

      <div className={`text-sm flex items-center ${
        isOnboarding || (enforceMinImages && images.length < minImages) 
          ? "text-amber-600" 
          : "text-gray-500"
      }`}>
        {(isOnboarding || (enforceMinImages && images.length < minImages)) ? (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>
              {isOnboarding 
                ? `You must upload at least ${minImages} photo to complete your profile ${maxImages > 1 ? `(max ${maxImages})` : ""}`
                : `You must upload at least ${minImages} photo ${maxImages > 1 ? `(max ${maxImages})` : ""}`
              }
            </span>
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4 mr-2" />
            <span>
              {minImages > 0 
                ? `Upload at least ${minImages} photo ${maxImages > 1 ? `(max ${maxImages})` : ""}`
                : `Upload up to ${maxImages} photos`
              }
            </span>
          </>
        )}
      </div>
      
      {isMobile && (
        <div className="text-xs text-gray-500 mt-2">
          <p>📱 Mobile tips:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Choose smaller images (under 5MB)</li>
            <li>Wait for each upload to complete before adding more</li>
            <li>Stay on this page until all uploads finish</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
