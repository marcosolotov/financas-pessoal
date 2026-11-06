import { createContext, useContext, useState } from 'react';
import { currentYM } from '../utils/month.js';

const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(currentYM());
  return <MonthContext.Provider value={{ month, setMonth }}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  return useContext(MonthContext);
}