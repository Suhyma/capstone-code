export type StackParamList = {
    Index: undefined; // undefined bc it doesn't need any other params
    Login: undefined;
    // Profile: { userId: string }; // Profile screen requires a userId (EXAMPLE)
    Registration: undefined;
    ChildHomeScreen: undefined;
    SLPHomeScreen: undefined;
    Demo: { exerciseType: string, word: string};
    Record: undefined;
    Feedback: { exerciseType: string; word: string; attemptNumber: number; score: number };
  };
  