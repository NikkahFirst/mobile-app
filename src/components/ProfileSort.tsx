
import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileSortProps {
  onSort: (sortOption: string) => void;
  currentSort: string;
}

const ProfileSort = ({ onSort, currentSort }: ProfileSortProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Select
      value={currentSort}
      onValueChange={(value) => onSort(value)}
    >
      <SelectTrigger className={`bg-background shadow-sm border-gray-200 h-9 ${isMobile ? 'w-[48px] px-2' : 'w-[140px]'}`}>
        <ArrowUpDown className="h-4 w-4 text-nikkah-pink mr-2" />
        {!isMobile && <SelectValue placeholder="Sort" />}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Newest Profiles</SelectItem>
        <SelectItem value="last_seen">Last Active</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ProfileSort;
