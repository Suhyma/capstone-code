# feedback dictionary of hardcoded feedback

feedback_dictionaries = {
    "ɹ": {
        "w": "Try starting with closed lips. Then lift your lips just slightly apart without making an 'o' shape. Focus on keeping your teeth close together with your tongue tip slightly hovering. ",
        "l": "Try lowering the tip of your tongue and keeping it stationary. Make the sound only moving your jaw ",
        "d": "Focus on keeping your tongue downwards and back while voicing the sound. "
    },
    "s": {
        "ʃ": "Try to keep your lips flat instead of round. Also keep your tongue tip closer to your lower teeth. ",
        "z": "Touch your throat while you practice, you shouldn't feel any vibrations when pronouncing 's'. ",
        "θ": "Bring your tongue far enough behind your teeth so your tongue doesn't touch your teeth. "
    },
    "t": {
        "d": "Make sure to cut off voicing and release a sharper burst of air. ",
        "k": "Place the tongue tip behind the upper teeth, not at the back of the mouth. ",
        "p": "Use your tongue instead of lips to obstruct airflow. "
    }
}

def generate_feedback_for_target(extra_phoneme, target_phoneme, feedback):
    feedback_dict = feedback_dictionaries.get(target_phoneme, {})
   
    if extra_phoneme in feedback_dict:
        feedback.append(f"{feedback_dict[extra_phoneme]}")
    else:
        generic = "Watch the video above for help! "
        if generic not in feedback:
            feedback.append(generic)

    return feedback