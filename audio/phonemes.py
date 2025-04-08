class PhonemeBank(dict):
    def __init__(self, phoneme_dict=None):
        """Initialize with an optional phoneme dictionary."""
        super().__init__(phoneme_dict or {})

    def get_ipa(self, word):
        """Return the IPA transcription of a word."""
        return self.get(word, "Unknown word")

    def add_word(self, word, ipa):
        """Add a new word with its IPA transcription."""
        self[word] = ipa

    def remove_word(self, word):
        """Remove a word from the bank."""
        if word in self:
            del self[word]

    def list_words(self):
        """Return a list of all words in the bank."""
        return list(self.keys())


# Overall word bank, add to this as we add words
WORD_BANK = PhonemeBank({
    "airplane": "e ə p l e ɪ n",
    "arrow": "æ r o ʊ",
    "berry": "b ɛ ɹ i",
    "carrot": "k æ ɹ ə t",
    "corn": "k ɔ r n",
    "door": "d ɔː",
    "hammer": "h æ m ə", 
    "insulator": "i n s ə l eɪ d ə r",
    "parent": "p ɛ r ə n t",
    "pirate": "p a ɪ ɹ ə t",
    "rabbit": "ɹ æ b ɪ t",
    "right": "ɹ aɪ t",
    "rocket": "r ɒ k ɪ t",
    "rope": "ɹ ə ʊ p",
    "run": "ɹ ʌ n",
    "say": "s e ɪ",
    "summer": "s ʌ m ɚ",
    "silly": "s ɪ l i",
    "sock": "s ɑ k",
    "stain": "s t eɪ n",
})

phoneme_bank_split = {word: phonemes.split() for word, phonemes in WORD_BANK.items()}
