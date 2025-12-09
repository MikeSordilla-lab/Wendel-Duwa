/**
 * SoundManager.js
 * Manages all sound effects and music for the game using Tone.js
 */

class SoundManager {
    constructor() {
        this.initialized = false;
        this.enabled = true;
        this.volume = -10; // Master volume in dB
        
        // Create master volume control
        this.masterVolume = new Tone.Volume(this.volume).toDestination();
        
        // Music player
        this.musicSynth = null;
        this.musicPattern = null;
        
        // Sound categories
        this.sounds = {
            weapons: {},
            explosions: {},
            ui: {},
            player: {},
            ultimate: {}
        };
    }
    
    /**
     * Initialize the audio context (must be called after user interaction)
     */
    async init() {
        if (this.initialized) return;
        
        try {
            await Tone.start();
            console.log("Audio context started");
            this.initialized = true;
            this.setupSounds();
            this.startBackgroundMusic();
        } catch (error) {
            console.error("Failed to initialize audio:", error);
        }
    }
    
    /**
     * Setup all synthesized sounds
     */
    setupSounds() {
        // Weapon sounds - Machine Gun (rapid fire synth)
        this.sounds.weapons.machineGun = () => {
            const synth = new Tone.MembraneSynth({
                pitchDecay: 0.008,
                octaves: 2,
                envelope: {
                    attack: 0.0006,
                    decay: 0.5,
                    sustain: 0
                }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("C2", "32n", now);
            
            // Add noise burst for impact
            const noise = new Tone.NoiseSynth({
                noise: { type: "white" },
                envelope: {
                    attack: 0.001,
                    decay: 0.05,
                    sustain: 0
                }
            }).connect(this.masterVolume);
            noise.triggerAttackRelease("32n", now);
            
            // Cleanup
            setTimeout(() => {
                synth.dispose();
                noise.dispose();
            }, 500);
        };
        
        // Shotgun sound (deeper, heavier)
        this.sounds.weapons.shotgun = () => {
            const synth = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 6,
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0.01,
                    release: 0.2
                }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("C1", "8n", now);
            
            // Add metallic click
            const metalSynth = new Tone.MetalSynth({
                frequency: 200,
                envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                harmonicity: 12,
                modulationIndex: 20,
                resonance: 2000,
                octaves: 0.5
            }).connect(this.masterVolume);
            metalSynth.triggerAttackRelease("16n", now + 0.05);
            
            setTimeout(() => {
                synth.dispose();
                metalSynth.dispose();
            }, 500);
        };
        
        // Ranged enemy projectile
        this.sounds.weapons.ranged = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "triangle" },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0.1,
                    release: 0.1
                }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("A3", "16n", now);
            
            setTimeout(() => synth.dispose(), 500);
        };
        
        // Explosion sound
        this.sounds.explosions.standard = () => {
            const synth = new Tone.MembraneSynth({
                pitchDecay: 0.08,
                octaves: 4,
                envelope: {
                    attack: 0.001,
                    decay: 0.3,
                    sustain: 0.01,
                    release: 0.5
                }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("C1", "4n", now);
            
            // Add distorted noise for impact
            const noise = new Tone.NoiseSynth({
                noise: { type: "brown" },
                envelope: {
                    attack: 0.001,
                    decay: 0.2,
                    sustain: 0.1,
                    release: 0.3
                }
            }).connect(this.masterVolume);
            noise.triggerAttackRelease("8n", now);
            
            setTimeout(() => {
                synth.dispose();
                noise.dispose();
            }, 1000);
        };
        
        // Melee attack sound
        this.sounds.weapons.melee = () => {
            // Whoosh sound
            const whoosh = new Tone.NoiseSynth({
                noise: { type: "pink" },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0
                }
            }).connect(this.masterVolume);
            
            const filter = new Tone.Filter(2000, "lowpass").connect(this.masterVolume);
            whoosh.connect(filter);
            
            const now = Tone.now();
            whoosh.triggerAttackRelease("16n", now);
            
            // Impact sound
            const impact = new Tone.MembraneSynth({
                pitchDecay: 0.02,
                octaves: 3,
                envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
            }).connect(this.masterVolume);
            impact.triggerAttackRelease("G2", "32n", now + 0.08);
            
            setTimeout(() => {
                whoosh.dispose();
                filter.dispose();
                impact.dispose();
            }, 500);
        };
        
        // UI Sounds
        this.sounds.ui.click = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
            }).connect(this.masterVolume);
            
            synth.triggerAttackRelease("C5", "32n");
            setTimeout(() => synth.dispose(), 200);
        };
        
        this.sounds.ui.weaponSwitch = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.05 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("E4", "32n", now);
            synth.triggerAttackRelease("A4", "32n", now + 0.05);
            
            setTimeout(() => synth.dispose(), 300);
        };
        
        this.sounds.ui.purchase = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "triangle" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("C5", "16n", now);
            synth.triggerAttackRelease("E5", "16n", now + 0.08);
            synth.triggerAttackRelease("G5", "8n", now + 0.16);
            
            setTimeout(() => synth.dispose(), 600);
        };
        
        // Player feedback sounds
        this.sounds.player.damage = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
            }).connect(this.masterVolume);
            
            synth.triggerAttackRelease("C3", "16n");
            setTimeout(() => synth.dispose(), 400);
        };
        
        this.sounds.player.heal = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.3 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("G4", "8n", now);
            synth.triggerAttackRelease("B4", "8n", now + 0.1);
            synth.triggerAttackRelease("D5", "8n", now + 0.2);
            
            setTimeout(() => synth.dispose(), 800);
        };
        
        this.sounds.player.levelUp = () => {
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.4 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", now);
            synth.triggerAttackRelease(["E4", "G4", "C5"], "8n", now + 0.15);
            synth.triggerAttackRelease(["G4", "C5", "E5"], "4n", now + 0.3);
            
            setTimeout(() => synth.dispose(), 1200);
        };
        
        this.sounds.player.coinPickup = () => {
            const synth = new Tone.MetalSynth({
                frequency: 400,
                envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
                harmonicity: 8,
                modulationIndex: 20,
                resonance: 3000,
                octaves: 1.5
            }).connect(this.masterVolume);
            
            synth.triggerAttackRelease("32n");
            setTimeout(() => synth.dispose(), 300);
        };
        
        this.sounds.player.ammoPickup = () => {
            const synth = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease("A4", "32n", now);
            synth.triggerAttackRelease("C5", "32n", now + 0.05);
            
            setTimeout(() => synth.dispose(), 400);
        };
        
        // Ultimate ability sound
        this.sounds.ultimate.shockWave = () => {
            // Bass drop
            const bass = new Tone.MembraneSynth({
                pitchDecay: 0.5,
                octaves: 10,
                envelope: {
                    attack: 0.001,
                    decay: 1.5,
                    sustain: 0.3,
                    release: 1.0
                }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            bass.triggerAttackRelease("C0", "2n", now);
            
            // Rising synth
            const synth = new Tone.Synth({
                oscillator: { type: "sawtooth" },
                envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.8 }
            }).connect(this.masterVolume);
            
            synth.frequency.rampTo("C5", 0.5, now);
            synth.triggerAttackRelease("C2", "2n", now);
            
            // Wide noise burst
            const noise = new Tone.NoiseSynth({
                noise: { type: "white" },
                envelope: {
                    attack: 0.05,
                    decay: 0.8,
                    sustain: 0.2,
                    release: 1.0
                }
            }).connect(this.masterVolume);
            noise.triggerAttackRelease("1n", now);
            
            setTimeout(() => {
                bass.dispose();
                synth.dispose();
                noise.dispose();
            }, 3000);
        };
        
        // Wave sounds
        this.sounds.ui.waveStart = () => {
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "triangle" },
                envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.5 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease(["C4", "E4"], "8n", now);
            synth.triggerAttackRelease(["E4", "G4"], "8n", now + 0.1);
            synth.triggerAttackRelease(["G4", "C5"], "4n", now + 0.2);
            
            setTimeout(() => synth.dispose(), 1000);
        };
        
        this.sounds.ui.waveComplete = () => {
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: "sine" },
                envelope: { attack: 0.02, decay: 0.4, sustain: 0.2, release: 0.5 }
            }).connect(this.masterVolume);
            
            const now = Tone.now();
            synth.triggerAttackRelease(["C5", "E5", "G5"], "8n", now);
            synth.triggerAttackRelease(["E5", "G5", "C6"], "4n", now + 0.15);
            
            setTimeout(() => synth.dispose(), 1000);
        };
    }
    
    /**
     * Start ambient background music
     */
    startBackgroundMusic() {
        if (this.musicSynth) return;
        
        // Create a ambient synth pad
        this.musicSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: {
                attack: 2,
                decay: 1,
                sustain: 0.4,
                release: 4
            }
        }).connect(this.masterVolume);
        
        // Lower the music volume
        const musicVolume = new Tone.Volume(-20).connect(this.masterVolume);
        this.musicSynth.connect(musicVolume);
        
        // Create a simple atmospheric pattern
        const notes = ["C3", "Eb3", "G3", "Bb3", "C4", "G3", "Eb3", "Bb2"];
        let index = 0;
        
        this.musicPattern = new Tone.Loop((time) => {
            const note = notes[index % notes.length];
            this.musicSynth.triggerAttackRelease(note, "2n", time);
            index++;
        }, "2n");
        
        this.musicPattern.start(0);
        Tone.Transport.start();
    }
    
    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (this.musicPattern) {
            this.musicPattern.stop();
            this.musicPattern.dispose();
            this.musicPattern = null;
        }
        if (this.musicSynth) {
            this.musicSynth.dispose();
            this.musicSynth = null;
        }
    }
    
    /**
     * Play a weapon sound
     */
    playWeaponSound(weaponType = "machineGun") {
        if (!this.enabled || !this.initialized) return;
        
        const soundMap = {
            "Machine Gun (CE)": "machineGun",
            "Shotgun": "shotgun",
            "Assault Rifle": "machineGun",
            "SMG": "machineGun",
            "Sniper Rifle": "shotgun",
            "ranged": "ranged"
        };
        
        const soundType = soundMap[weaponType] || "machineGun";
        
        if (this.sounds.weapons[soundType]) {
            this.sounds.weapons[soundType]();
        }
    }
    
    /**
     * Play explosion sound
     */
    playExplosion() {
        if (!this.enabled || !this.initialized) return;
        if (this.sounds.explosions.standard) {
            this.sounds.explosions.standard();
        }
    }
    
    /**
     * Play melee attack sound
     */
    playMelee() {
        if (!this.enabled || !this.initialized) return;
        if (this.sounds.weapons.melee) {
            this.sounds.weapons.melee();
        }
    }
    
    /**
     * Play UI sound
     */
    playUI(type = "click") {
        if (!this.enabled || !this.initialized) return;
        if (this.sounds.ui[type]) {
            this.sounds.ui[type]();
        }
    }
    
    /**
     * Play player feedback sound
     */
    playPlayerSound(type) {
        if (!this.enabled || !this.initialized) return;
        if (this.sounds.player[type]) {
            this.sounds.player[type]();
        }
    }
    
    /**
     * Play ultimate ability sound
     */
    playUltimate() {
        if (!this.enabled || !this.initialized) return;
        if (this.sounds.ultimate.shockWave) {
            this.sounds.ultimate.shockWave();
        }
    }
    
    /**
     * Toggle sound on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * Set master volume
     */
    setVolume(db) {
        this.volume = db;
        this.masterVolume.volume.value = db;
    }
}

// Create global instance
const soundManager = new SoundManager();
