import React, { createContext, useContext, useState } from 'react';
// functions to help us keep track of the state of # of attempts in the background
// if we wanted to cap the # of attempts for a word at 3 tries

type AttemptContextType = {
  attemptNumber: number;
  incrementAttempt: () => void;
  resetAttempt: () => void;
};

const AttemptContext = createContext<AttemptContextType | undefined>(undefined);

export const AttemptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [attemptNumber, setAttemptNumber] = useState(1); // Start from 1

  const incrementAttempt = () => {
    setAttemptNumber((prev) => Math.min(prev + 1, 3)); // Max 3 attempts
  };

  const resetAttempt = () => {
    setAttemptNumber(1);
  };

  return (
    <AttemptContext.Provider value={{ attemptNumber, incrementAttempt, resetAttempt }}>
      {children}
    </AttemptContext.Provider>
  );
};

export const useAttempt = () => {
  const context = useContext(AttemptContext);
  if (!context) {
    throw new Error('useAttempt must be used within an AttemptProvider');
  }
  return context;
};
