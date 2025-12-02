// src/contexts/UISettingsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  subscribeToGlobalLoading,
} from "../lib/loadingBus";

interface UISettingsContextValue {
  isGlobalLoading: boolean;
}

const UISettingsContext = createContext<UISettingsContextValue | undefined>(
  undefined
);

export const UISettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGlobalLoading((loading) => {
      setIsGlobalLoading(loading);
    });
    return unsubscribe;
  }, []);

  const value: UISettingsContextValue = {
    isGlobalLoading,
  };

  return (
    <UISettingsContext.Provider value={value}>
      {children}
    </UISettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUISettings = (): UISettingsContextValue => {
  const ctx = useContext(UISettingsContext);
  if (!ctx) {
    throw new Error("useUISettings must be used within UISettingsProvider");
  }
  return ctx;
};
