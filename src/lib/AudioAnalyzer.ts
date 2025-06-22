export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private source: MediaElementAudioSourceNode | null = null;
  private isAnalyzing = false;

  constructor(audioElement: HTMLAudioElement) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  public start() {
    this.isAnalyzing = true;
  }

  public stop() {
    this.isAnalyzing = false;
  }

  public getFrequencyData(): number[] {
    if (!this.isAnalyzing) return new Array(this.analyser.frequencyBinCount).fill(0);

    this.analyser.getByteFrequencyData(this.dataArray);
    return Array.from(this.dataArray);
  }

  public getWaveformData(): number[] {
    if (!this.isAnalyzing) return new Array(this.analyser.frequencyBinCount).fill(128);

    this.analyser.getByteTimeDomainData(this.dataArray);
    return Array.from(this.dataArray);
  }

  public getEnergy(): number {
    const frequencies = this.getFrequencyData();
    return frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length;
  }

  public getBassEnergy(): number {
    const frequencies = this.getFrequencyData();
    // First 10% of frequencies represent bass range
    const bassRange = frequencies.slice(0, Math.floor(frequencies.length * 0.1));
    return bassRange.reduce((sum, value) => sum + value, 0) / bassRange.length;
  }

  public getMidEnergy(): number {
    const frequencies = this.getFrequencyData();
    // 10-50% of frequencies represent mid range
    const midRange = frequencies.slice(
      Math.floor(frequencies.length * 0.1),
      Math.floor(frequencies.length * 0.5)
    );
    return midRange.reduce((sum, value) => sum + value, 0) / midRange.length;
  }

  public getHighEnergy(): number {
    const frequencies = this.getFrequencyData();
    // Last 50% of frequencies represent high range
    const highRange = frequencies.slice(Math.floor(frequencies.length * 0.5));
    return highRange.reduce((sum, value) => sum + value, 0) / highRange.length;
  }
}