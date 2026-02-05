import * as React from "react";
import { createContext, useContext, useState } from "react";

export interface NavigationEntry {
  type?: string;
  name: string;
  url?: string;
  id?: string | number;
}

interface NavigationContextValue {
  navigation: NavigationEntry[];
  setNavigation: React.Dispatch<React.SetStateAction<NavigationEntry[]>>;
}

const initialState: NavigationContextValue = {
  navigation: [],
  setNavigation: () => null,
};

const NavigationProviderContext = createContext<NavigationContextValue>(initialState);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children, ...props }: NavigationProviderProps) {
  const [navigation, setNavigation] = useState<NavigationEntry[]>([]);

  const value: NavigationContextValue = {
    navigation,
    setNavigation,
  };

  return (
    <NavigationProviderContext.Provider {...props} value={value}>
      {children}
    </NavigationProviderContext.Provider>
  );
}

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationProviderContext);

  if (context === undefined)
    throw new Error("useNavigation must be used within a NavigationProvider");

  return context;
};
