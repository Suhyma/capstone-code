export type StackParamList = {
  Index: undefined;
  Login: undefined;
  Registration: undefined;
  
  // Client-facing screens
  ChildHomeScreen: undefined;
  Demo: { wordSet: string[], currentIndex: number};
  Record: { wordSet: string[], currentIndex: number, attemptNumber: number};
  Feedback: { wordSet: string[], currentIndex: number, attemptNumber: number, score: number, feedback: string };
  CompletionScreen: { overallScore: number, seedsCollected: number };

  // SLP-facing screens
  SLPHomeScreen: undefined;
  ClientDetailsScreen: undefined;
};
