
window.AudioVisualizer = class {
    constructor(visualizerElement, barElements) {
        this.ctx = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.visualizerElement = visualizerElement;
        this.bars = barElements;
        this.isListening = false;
        this.animationId = null;
    }

    async start() {
        if (this.isListening) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 32; // As requested

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.source = this.ctx.createMediaStreamSource(stream);
            this.source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.isListening = true;
            this.visualizerElement.classList.add('active');
            this.animate();
        } catch (err) {
            console.error('Audio start failed:', err);
        }
    }

    stop() {
        if (!this.isListening) return;
        this.isListening = false;
        this.visualizerElement.classList.remove('active');
        if (this.ctx) this.ctx.close();
        cancelAnimationFrame(this.animationId);
        // Reset bars
        this.bars.forEach(bar => bar.style.height = '10px');
    }

    animate() {
        if (!this.isListening) return;

        this.animationId = requestAnimationFrame(() => this.animate());
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate "Volume Average" as requested: Sum / Length
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const averageVolume = sum / this.dataArray.length;

        // Visual mapping: Use averageVolume to drive bar height with some variance per bar
        this.bars.forEach((bar, index) => {
            // Create a "wave" effect based on volume and index
            const boost = (this.dataArray[index] || averageVolume) / 255;
            const height = 10 + (boost * 40); // Base 10px, Max additional 40px
            bar.style.height = `${height}px`;
        });
    }
}
