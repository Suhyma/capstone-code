% audio analysis
[x, fs] = audioread('carrot_kid.wav');   % Load child's voice audio
f0raw = MulticueF0v14(x, fs);             % Extract F₀ (pitch contour)
ap = exstraightAPind(x, fs, f0raw);       % Extract aperiodicity index
n3sgram = exstraightspec(x, f0raw, fs);   % Extract the STRAIGHT spectrogram (smoothed spectral envelope)

% F0 pitch scaling
f0adult = f0raw * 0.5;  % Scale down F₀ for an adult pitch

% formant shifting
freq_scale = 0.8;  % Scale factor for formant shifting (e.g., 0.8 compresses the frequency axis)
[rows, cols] = size(n3sgram);
new_freq_axis = linspace(1, rows, round(rows * freq_scale));  % New frequency axis
n3sgram_shifted = interp1(1:rows, n3sgram, new_freq_axis, 'linear', 0);  % Interpolation

% recombine the modified params -> resynthesize signal
adult_voice = exstraightsynth(f0adult, n3sgram_shifted, ap, fs);

% save and play audio
audiowrite('adult_voice.wav', adult_voice / max(abs(adult_voice)), fs);
soundsc(adult_voice, fs);                       % Play the modified audio
