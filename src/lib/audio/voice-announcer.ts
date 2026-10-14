/**
 * Voice Announcer Utility for SDN Kandangan I Tosari
 * Menggunakan Web Speech API (speechSynthesis) untuk suara perempuan Bahasa Indonesia
 * dengan tempo agak dipercepat dan format ringkas:
 * "Selamat datang, [Nama Panggilan], [Kelas]"
 */

export interface AttendanceAnnouncementOptions {
  name: string;
  nickname?: string | null;
  className?: string | null;
  status?: string | null; // "HADIR" | "TERLAMBAT" | dll.
  isTeacher?: boolean;
}

/**
 * Ekstraksi nama panggilan siswa secara cerdas
 */
export function extractCallName(fullName: string, nickname?: string | null): string {
  if (nickname && nickname.trim()) return nickname.trim();
  const trimmed = (fullName || "Siswa").trim();
  const words = trimmed.split(/\s+/);
  if (words.length === 0) return "Siswa";

  // Jika nama depan adalah awalan umum seperti Muhammad, M., Moch, Ahmad, gunakan nama kedua
  const firstLower = words[0].toLowerCase();
  const commonPrefixes = ["muhammad", "mochammad", "moch", "m.", "ahmad", "achmad"];
  if (commonPrefixes.includes(firstLower) && words.length > 1) {
    return words[1];
  }
  return words[0];
}

// Chime Audio Context Helper ringkas dan cepat
function playAnnouncementChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    // Nada C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Nada E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.14, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.26);
  } catch (e) {
    // Audio context fallback
  }
}

/**
 * Mencari suara perempuan Bahasa Indonesia terbaik yang tersedia di browser
 */
function getBestIndonesianFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const femaleKeywords = ["female", "wanita", "perempuan", "gadis", "novia", "arista", "siti", "natural", "online"];
  const indonesianVoices = voices.filter(
    (v) => v.lang.toLowerCase().startsWith("id") || v.lang.toLowerCase().includes("indonesia")
  );

  for (const voice of indonesianVoices) {
    const lowerName = voice.name.toLowerCase();
    if (femaleKeywords.some((kw) => lowerName.includes(kw))) {
      return voice;
    }
  }

  if (indonesianVoices.length > 0) {
    return indonesianVoices[0];
  }

  return null;
}

/**
 * Mengucapkan sambutan presensi:
 * "Selamat datang, [Nama Panggilan], [Kelas]" (agak dipercepat)
 */
export function speakAttendanceGreeting(options: AttendanceAnnouncementOptions): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    // Mainkan chime ringkas
    playAnnouncementChime();

    // Batalkan pengucapan sebelumnya agar langsung beralih ke siswa terbaru
    window.speechSynthesis.cancel();

    const { name, nickname, className, status, isTeacher } = options;
    const callName = extractCallName(name, nickname);
    const isLate = status === "TERLAMBAT";

    // Format kalimat ringkas sesuai permintaan user:
    // "Selamat datang, Nama Panggilan, Kelas"
    let textToSpeak = "";
    if (isTeacher) {
      textToSpeak = `Selamat datang, ${callName}.`;
    } else {
      const classText = className ? className.trim() : "Siswa";
      if (isLate) {
        textToSpeak = `Selamat datang, ${callName}, ${classText}, terlambat.`;
      } else {
        textToSpeak = `Selamat datang, ${callName}, ${classText}.`;
      }
    }

    // Delay sangat singkat (80ms) setelah nada chime agar responsif
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "id-ID";

        const voice = getBestIndonesianFemaleVoice();
        if (voice) {
          utterance.voice = voice;
        }

        // Pitch 1.12 (suara wanita bersahabat)
        // Rate 1.10 (agak dipercepat, tanggap & artikulatif untuk gerbang sekolah)
        utterance.pitch = 1.12;
        utterance.rate = 1.10;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis error:", err);
        resolve();
      }
    }, 80);
  });
}

/**
 * Uji coba sampel suara perempuan untuk operator
 */
export function testFemaleVoice(sampleName = "Bagas Dimas Setiawan", sampleClass = "Kelas 4"): Promise<void> {
  return speakAttendanceGreeting({
    name: sampleName,
    nickname: "Bagas",
    className: sampleClass,
    status: "HADIR",
    isTeacher: false,
  });
}
