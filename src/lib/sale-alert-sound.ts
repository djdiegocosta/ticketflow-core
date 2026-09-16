/**
 * Toca um "ding" curto e discreto — duas notas subindo, como uma
 * campainha de loja. Gerado por código (Web Audio API), sem precisar de
 * nenhum arquivo de áudio.
 *
 * Navegadores bloqueiam áudio antes de qualquer interação do usuário na
 * página — como isso dispara a partir de um evento em tempo real (não de
 * um clique), o primeiro som pode falhar silenciosamente se o admin não
 * tiver clicado em nada ainda. Isso é esperado e tratado (erro ignorado).
 */
export function playSaleAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(880, now, 0.18); // Lá
    playNote(1318.5, now + 0.12, 0.25); // Mi (uma quinta acima) — o "ding" de confirmação

    // Fecha o contexto de áudio depois de tocar, pra não acumular recursos.
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch (error) {
    console.error("[SaleAlertSound] Não foi possível tocar o som:", error);
  }
}
