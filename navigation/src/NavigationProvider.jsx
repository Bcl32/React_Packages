import { createContext, useContext, useState } from "react";

const initialState = {
  //   navigation: [{ type: "default", name: "Home" }],
  navigation: [],
  setNavigation: () => null,
};

const NavigationProviderContext = createContext(initialState);

export function NavigationProvider({ children, ...props }) {
  const [navigation, setNavigation] = useState([]);

  const value = {
    navigation,
    setNavigation,
  };

  return (
    <NavigationProviderContext.Provider {...props} value={value}>
      {children}
    </NavigationProviderContext.Provider>
  );
}

export const useNavigation = () => {
  const context = useContext(NavigationProviderContext);

  if (context === undefined)
    throw new Error("useNavigation must be used within a NavigationProvider");

  return context;
};
