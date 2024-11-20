import { createContext, useState, useContext } from 'react';

interface GlobalState {
  number: number | null;
}

interface GlobalStateContextType {
  state: GlobalState;
  updateNumber: (newNumber: number) => void;
}

const initialState: GlobalState = {
  number: null,
};

// Update the context to expect both state and updateNumber
const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

export const GlobalStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GlobalState>(initialState);

  const updateNumber = (newNumber: number) => {
    setState({ ...state, number: newNumber });
  };

  return (
    <GlobalStateContext.Provider value={{ state, updateNumber }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === null) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};
