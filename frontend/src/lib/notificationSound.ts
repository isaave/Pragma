/**
 * Som curto e discreto para novas notificações, gerado com Web Audio API.
 * Não depende de arquivo de áudio e falha silenciosamente se o navegador
 * bloquear a reprodução automática.
 */

type AudioWindow = Window & {
    webkitAudioContext?: typeof AudioContext;
};

let audioUnlocked = false;
let unlockedListenersRegistered = false;

/** Registra listeners de primeira interação para liberar o áudio do navegador. */
export function registerAudioUnlockListeners(): void {
    if (unlockedListenersRegistered || typeof window === 'undefined') return;
    unlockedListenersRegistered = true;

    const unlock = () => {
        audioUnlocked = true;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
}

/** Reproduz um toque suave. Chamadas sem interação prévia são ignoradas. */
export function playNotificationSound(): void {
    if (!audioUnlocked || typeof window === 'undefined') return;

    try {
        const audioWindow = window as AudioWindow;
        const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
        if (!AudioContextClass) return;

        const context = new AudioContextClass();
        const now = context.currentTime;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

        oscillator.onended = () => {
            void context.close().catch(() => undefined);
        };
    } catch {
        // Autoplay bloqueado ou Web Audio indisponível: nunca quebrar a aplicação.
    }
}
