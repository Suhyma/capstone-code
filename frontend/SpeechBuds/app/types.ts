export type StackParamList = {
    Index: undefined; // undefined bc it doesn't need any other params
    Login: undefined;
    Registration: undefined;
    ChildHomeScreen: undefined;
    SLPHomeScreen: undefined;
    Demo: { exerciseType: string, word: string};
    Record: { word: string, attemptNumber: number}; // want to give them max 3 tries for a word
    Feedback: { exerciseType: string; word: string; attemptNumber: number; score: number };
  };
  