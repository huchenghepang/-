class VerticalVolumeControl {
    constructor(audioElement, containerElement, initialVolume = 1) {
        this.audioElement = audioElement;
        this.containerElement = containerElement;
        this.currentVolume = initialVolume;
        this.isMuted = false;

        this.init();
    }

    init() {
        const volumeIcon = document.createElement('img');
        volumeIcon.src = this.getVolumeIcon(this.currentVolume);
        volumeIcon.className = 'volume-icon';
        volumeIcon.addEventListener('click', () => this.toggleMute(volumeIcon));

        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = 0;
        volumeSlider.max = 100;
        volumeSlider.value = this.currentVolume * 100;
        volumeSlider.className = 'volume-slider';
        volumeSlider.addEventListener('input', (event) => this.adjustVolume(event, volumeIcon));

        this.containerElement.appendChild(volumeSlider);
        this.containerElement.appendChild(volumeIcon);
    }

    adjustVolume(event, volumeIcon) {
        const volume = event.target.value / 100;
        this.audioElement.volume = volume;
        this.currentVolume = volume;
        this.isMuted = volume === 0;
        volumeIcon.src = this.getVolumeIcon(volume);
    }

    toggleMute(volumeIcon) {
        if (this.isMuted) {
            this.audioElement.volume = this.currentVolume;
            this.isMuted = false;
        } else {
            this.currentVolume = this.audioElement.volume;
            this.audioElement.volume = 0;
            this.isMuted = true;
        }
        volumeIcon.src = this.getVolumeIcon(this.audioElement.volume);
    }

    getVolumeIcon(volume) {
        if (volume === 0 || this.isMuted) {
            return 'mute-icon.png';
        } else if (volume <= 0.5) {
            return 'volume-down-icon.png';
        } else {
            return 'volume-up-icon.png';
        }
    }
}
// 使用封装的组件
const audio = document.getElementById('audioPlayer');
const volumeControlContainer = document.getElementById('volumeControl');
const verticalVolumeControl = new VerticalVolumeControl(audio, volumeControlContainer, 1);