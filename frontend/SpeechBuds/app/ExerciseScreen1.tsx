import { useVideoPlayer, VideoView } from 'expo-video';
import { VideoSource } from 'expo-video';

import assetId from '@/assets/videos/Test.mp4'; 

const videoSource: VideoSource = {
  assetId, // Use the required asset as assetId (NOT a URI)
  metadata: {
    title: 'Big Buck Bunny',
    artist: 'The Open Movie Project',
  },
};


const player = useVideoPlayer(videoSource); // Use the correct format