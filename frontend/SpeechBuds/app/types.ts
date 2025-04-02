export type StackParamList = {
  Index: undefined;
  Login: undefined;
  Registration: undefined;
  
  // Client-facing screens
  ChildHomeScreen: undefined;
  Demo: { wordSet: string[], currentIndex: number, scoreTracking: number[]};
  Record: { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[]};
  Record_CV: { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[], returnFromCv?: boolean,  cvEnabled?: boolean};
  new_CV: { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[], returnFromCv?: boolean,  cvEnabled?: boolean};
  Feedback: { wordSet: string[], currentIndex: number, attemptNumber: number, score: number, feedback: string, scoreTracking: number[]};
  CompletionScreen: { overallScore: number, seedsCollected: number };

  GardenGame: undefined;
  GardenContent: undefined;
  

  // SLP-facing screens
  SLPHomeScreen: undefined;
  ClientDetailsScreen: undefined;
};
