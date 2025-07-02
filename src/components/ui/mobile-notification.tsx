
import { AlertTriangle, Check, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const notificationVariants = cva(
  "fixed bottom-0 left-0 right-0 p-4 transform transition-transform duration-300 flex items-center justify-between z-50",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-t border-border",
        success: "bg-green-500 text-white",
        error: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface MobileNotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  message: string;
  visible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function MobileNotification({
  className,
  message,
  visible,
  onClose,
  variant,
  autoClose = true,
  duration = 3000,
  ...props
}: MobileNotificationProps) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
    
    let timer: NodeJS.Timeout;
    if (visible && autoClose) {
      timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300); // Wait for animation to complete
      }, duration);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, autoClose, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // Wait for animation to complete
  };

  const getIcon = () => {
    if (variant === "success") return <Check className="h-5 w-5" />;
    if (variant === "error") return <AlertTriangle className="h-5 w-5" />;
    return null;
  };

  return (
    <div
      className={cn(
        notificationVariants({ variant }),
        isVisible ? "translate-y-0" : "translate-y-full",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span>{message}</span>
      </div>
      <button onClick={handleClose} className="p-1">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
