export interface LandmarksData {
    landmarks: [number, number][] | null;
    type: string;
    indices: {
      jaw: number[];
      mouth: number[];
    };
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    }
  }
