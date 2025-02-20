from collections import defaultdict

PHONEME_SIMILARITY = {
    # Vowel variations
    ('ɪ', 'i'): 0,  # Short vs. tense high front vowel
    ('ɛ', 'æ'): 0,  # Slight vowel shift, esp. before nasals
    ('ʊ', 'u'): 0,  # Short vs. tense high back vowel
    ('ʌ', 'ɑ'): 0,  # Canadian speakers may merge /ʌ/ and /ɑ/
    ('oʊ', 'ɔ'): 0,  # Canadian *o*-merger
    ('eɪ', 'ɛ'): 0,  # Raising effect before /r/ (e.g., *Mary* may sound like /mɛri/)
    ('u', 'ə'): 0, # Common vowel reduction with "u" sound (e.g. the word insulator, from ins/yu/lator to in/suh/lator)
    
    # Canadian Raising (pre-voiceless shift)
    # ('aɪ', 'ʌɪ'): 0,  # Raised diphthong (e.g., *write* /ʌɪt/ vs. *ride* /aɪd/)
    # ('aʊ', 'ʌʊ'): 0,  # Raised diphthong (e.g., *about* → [ʌˈbʌʊt])

    # both share the a vs ʌ, so just compare the single phonemes
    ('a', 'ʌ'): 0,  # Raised diphthong vowel


    # Consonants: Flapping & Voicing Effects
    ('t', 'd'): 0,  # Flapping (e.g., *butter* ~ *budder*)
    ('t', 'ɾ'): 0,  # Flapped /t/ is close to [ɾ]
    ('d', 'ɾ'): 0,  # Flapped /d/ is close to [ɾ]
    ('s', 'z'): 0,  # Voicing shift (*houses* /ˈhaʊsɪz/ → [ˈhaʊsɪs])
    ('ʃ', 'ʒ'): 0,  # *measure* may be /ˈmɛʒɚ/ instead of /ˈmɛʃɚ/
    ('θ', 'ð'): 0,  # Voicing shift in TH sounds
    ('θ', 't'): 0,  # TH-stopping in some dialects (*think* → [tɪŋk])
    ('ð', 'd'): 0,  # TH-stopping (*this* → [dɪs])

    # Nasal and Liquid Assimilation
    ('n', 'ŋ'): 0.4,  # Final nasal shifts (*running* → [rʌnɪŋ] ~ [rʌnɪn])

    # Glottalization
    ('t', 'ʔ'): 0.5,  # Glottal stop replacement (e.g., *cat* → [kæʔ])
}

# Convert to a defaultdict for O(1) lookups
SIMILARITY_LOOKUP = defaultdict(lambda: 1.0, PHONEME_SIMILARITY)



