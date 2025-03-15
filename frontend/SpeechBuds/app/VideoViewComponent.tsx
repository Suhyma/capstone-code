import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video"
import { IconButton } from "react-native-paper";

interface VideoViewComponentProps {
    video: string;
    setVideo: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function VideoViewComponent({
    video, 
    setVideo,
}: VideoViewComponentProps) {
    const videoViewRef = useRef<VideoView>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const player = useVideoPlayer(video, (player) => {
        player.muted = false;
        player.loop = false;
        player.play();
    });

    useEffect(() => {
        const subscription = player.addListener("playingChange", (event) => {
            setIsPlaying(event.isPlaying)
        })

        return () => {
            subscription.remove()
        }
    }, [player])
    
    return (
        <View>
            <View>
                <IconButton
                    onPress={() => setVideo("")}
                    icon={isPlaying ? "play" : "pause"}
                    // androidName={isPlaying ? "play" : "pause"}
                ></IconButton>
                
            </View>
            <View
                style={{
                    position: "absolute",
                    right: 6,
                    zIndex: 1,
                    paddingTop: 50,
                    gap: 16,
                }}>

            </View>
            <VideoView
            ref = {videoViewRef}
            style={{
                width: '100%',
                height: '100%',
            }}
            player={player}
            allowsFullscreen
            nativeControls>

            </VideoView>
        </View>
    )
}