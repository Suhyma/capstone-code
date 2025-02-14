class PhonemeBank:
    def __init__(self, phoneme_dict=None):
        """Initialize with an optional phoneme dictionary."""
        self.phoneme_dict = phoneme_dict or {}

    def get_ipa(self, word):
        """Return the IPA transcription of a word."""
        return self.phoneme_dict.get(word, "Unknown word")

    def add_word(self, word, ipa):
        """Add a new word with its IPA transcription."""
        self.phoneme_dict[word] = ipa

    def remove_word(self, word):
        """Remove a word from the bank."""
        if word in self.phoneme_dict:
            del self.phoneme_dict[word]

    def list_words(self):
        """Return a list of all words in the bank."""
        return list(self.phoneme_dict.keys())


# (initially) Alphabetically ordered word bank of all words used in speech exercises
word_bank = PhonemeBank({
    "airplane": "e ə p l e ɪ n",
    "berry": "b ɛ ɹ i",
    "car": "k ɑː",
    "carrot": "k æ ɹ ə t",
    "door": "d ɔː",
    "hammer": "h æ m ə", 
    "insulator": "i n s ə l ā d ə r",
    "pirate": "p a ɪ ɹ ə t",
    "rabbit": "ɹ æ b ɪ t",
    "right": "ɹ aɪ t",
    "rocket ": "r ɒ k ɪ t",
    "rope": "ɹ ə ʊ p",
    "run": "ɹ ʌ n",
})

print(word_bank.get_ipa("rope"))     # Output: ɹ ə ʊ p
print(word_bank.get_ipa("unicorn"))  # Output: Unknown word

word_bank.add_word("unicorn", "j uː n ɪ k ɔː n")
print(word_bank.get_ipa("unicorn"))  # Output: j uː n ɪ k ɔː n

word_bank.remove_word("rabbit")
print(word_bank.list_words())  # Output: ['run', 'rope', 'carrot', 'pirate', 'unicorn']
