export type StackParamList = {
  Index: undefined; // undefined bc it doesn't need any other params
  Login: undefined;
  Registration: undefined;
  ChildHomeScreen: undefined;
  SLPHomeScreen: undefined;
  Demo: { wordSet: string[], currentIndex: number};
  Record: { wordSet: string[], currentIndex: number, attemptNumber: number}; // want to give them max 3 tries for a word
  Feedback: { wordSet: string[], currentIndex: number, attemptNumber: number, score: number, feedback: string };
};
