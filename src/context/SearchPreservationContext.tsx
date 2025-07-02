
import React, { createContext, useContext, useState, useEffect } from "react";
import { FilterOptions } from "@/components/ProfileFilters";

interface SearchPreservationContextType {
  filters: FilterOptions | null;
  setFilters: (filters: FilterOptions | null) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
  resetSearch: boolean;
  setResetSearch: (reset: boolean) => void;
  lastViewedProfile: string | null;
  setLastViewedProfile: (profileId: string | null) => void;
}

const SearchPreservationContext = createContext<SearchPreservationContextType | undefined>(undefined);

export const SearchPreservationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [resetSearch, setResetSearch] = useState<boolean>(false);
  const [lastViewedProfile, setLastViewedProfile] = useState<string | null>(null);

  // Log changes for debugging
  useEffect(() => {
    console.log("Filters updated in context:", filters);
  }, [filters]);

  useEffect(() => {
    console.log("Scroll position updated in context:", scrollPosition);
  }, [scrollPosition]);

  return (
    <SearchPreservationContext.Provider value={{ 
      filters, 
      setFilters, 
      scrollPosition, 
      setScrollPosition,
      resetSearch,
      setResetSearch,
      lastViewedProfile,
      setLastViewedProfile
    }}>
      {children}
    </SearchPreservationContext.Provider>
  );
};

export const useSearchPreservation = () => {
  const context = useContext(SearchPreservationContext);
  if (context === undefined) {
    throw new Error("useSearchPreservation must be used within a SearchPreservationProvider");
  }
  return context;
};
