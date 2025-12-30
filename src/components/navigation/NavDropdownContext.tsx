import { createContext, useContext, useState, ReactNode } from "react";

type DropdownId = "studio" | "library" | null;

interface NavDropdownContextType {
  openDropdown: DropdownId;
  setOpenDropdown: (id: DropdownId) => void;
}

const NavDropdownContext = createContext<NavDropdownContextType | undefined>(undefined);

export const NavDropdownProvider = ({ children }: { children: ReactNode }) => {
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);

  return (
    <NavDropdownContext.Provider value={{ openDropdown, setOpenDropdown }}>
      {children}
    </NavDropdownContext.Provider>
  );
};

export const useNavDropdown = () => {
  const context = useContext(NavDropdownContext);
  if (!context) {
    throw new Error("useNavDropdown must be used within NavDropdownProvider");
  }
  return context;
};
