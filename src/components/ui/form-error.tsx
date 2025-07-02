
import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormErrorProps {
  message?: string;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 text-destructive text-sm mt-1", 
      className
    )}>
      <AlertTriangle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
};
