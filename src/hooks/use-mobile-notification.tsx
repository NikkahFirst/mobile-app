
import React, { createContext, useContext, useState } from "react";
import { MobileNotification } from "@/components/ui/mobile-notification";

type NotificationType = "default" | "success" | "error";

interface MobileNotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const MobileNotificationContext = createContext<MobileNotificationContextType | undefined>(undefined);

export function MobileNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<{
    message: string;
    visible: boolean;
    type: NotificationType;
  }>({
    message: "",
    visible: false,
    type: "default",
  });

  const showNotification = (message: string, type: NotificationType = "default") => {
    setNotification({
      message,
      visible: true,
      type,
    });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  return (
    <MobileNotificationContext.Provider value={{ showNotification }}>
      {children}
      <MobileNotification
        message={notification.message}
        visible={notification.visible}
        onClose={hideNotification}
        variant={notification.type}
      />
    </MobileNotificationContext.Provider>
  );
}

export const useMobileNotification = () => {
  const context = useContext(MobileNotificationContext);
  if (!context) {
    throw new Error("useMobileNotification must be used within a MobileNotificationProvider");
  }
  return context;
};
