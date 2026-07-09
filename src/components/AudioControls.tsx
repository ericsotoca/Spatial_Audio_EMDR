import React, { useState } from 'react';
import { SoundType, TrajectoryType, SoundOption, TrajectoryOption } from '../types';
import { Play, Square, Volume2, Music, Orbit, ChevronDown, ChevronUp } from 'lucide-react';

interface AudioControlsProps {
  volume: number;
  onChangeVolume: (vol: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isAutopilot: boolean;
  activeTrajectory: TrajectoryType;
  onChangeTrajectory: (type: TrajectoryType) => void;
  orbitSpeed: number;
  onChangeOrbitSpeed: (speed: number) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  volume,
  onChangeVolume,
  isPlaying,
  onTogglePlay,
  isAutopilot,
  activeTrajectory,
  onChangeTrajectory,
  orbitSpeed,
  onChangeOrbitSpeed,
}) => {
  const trajectoryOptions: TrajectoryOption[] = [
    {
      id: 'left_right',
      name: 'Gauche-Droite',
      description: 'Mouvement linéaire oscillant de gauche à droite devant vous.',
    },
    {
      id: 'teleport_left_right',
      name: 'Saut G-D',
      description: 'Bascule instantanément de gauche à droite sans passer par le centre.',
    },
    {
      id: 'up_down',
      name: 'Haut-Bas',
      description: 'Oscillation verticale ample pour tester la perception d\'élévation 3D.',
    },
    {
      id: 'teleport_up_down',
      name: 'Saut H-B',
      description: 'Bascule instantanément de haut en bas sans passer par le centre.',
    },
    {
      id: 'circle',
      name: 'Cercle 360°',
      description: 'Orbite horizontale circulaire standard à hauteur fixe.',
    },
    {
      id: 'infinity',
      name: 'Infini (∞)',
      description: 'Trajectoire complexe en lemniscate (figure-8) croisant les oreilles.',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Autopilot/Orbite automatic Card */}
      <div id="autopilot-card" className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200/40 dark:border-white/10 p-5 shadow-xl transition-all duration-300">
        
        {/* Header (No Switcher) */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Orbit className="w-4 h-4" />
            </div>
            <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              1. Orbite Automatique (Autopilote)
            </h3>
          </div>
        </div>

        {/* Autopilot details (Always Interactive) */}
        <div className="transition-all duration-300 opacity-100">
          
          {/* Trajectory option pills */}
          <div className="mb-4">
            <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Trajectoire 3D
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 p-1 bg-slate-200/40 dark:bg-black/35 rounded-xl border border-slate-200/50 dark:border-white/5">
              {trajectoryOptions.map((traj) => {
                const isSelected = activeTrajectory === traj.id && isAutopilot;
                return (
                  <button
                    key={traj.id}
                    id={`traj-${traj.id}`}
                    onClick={() => onChangeTrajectory(traj.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/20 dark:hover:bg-white/5'
                    }`}
                  >
                    {traj.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              <span>VITESSE D'ORBITE</span>
              <span className="font-semibold text-sky-500 dark:text-sky-400">{orbitSpeed.toFixed(1)}x</span>
            </div>
            <input
              id="orbit-speed-slider"
              type="range"
              min="0.2"
              max="4"
              step="0.1"
              value={orbitSpeed}
              onChange={(e) => onChangeOrbitSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

        </div>
      </div>

      {/* Playback Controller Card */}
      <div id="playback-card" className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200/40 dark:border-white/10 p-5 shadow-xl transition-all duration-300">
        <h3 className="font-display font-semibold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
          Contrôleur de Lecture
        </h3>
        
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Main Play/Stop Button */}
          <button
            id="play-toggle-btn"
            onClick={onTogglePlay}
            className={`w-full sm:w-auto flex-grow flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-display font-bold text-sm tracking-wide shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all duration-200 cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-white stroke-none" />
                <span>ARRÊTER LE SON</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white stroke-none" />
                <span>DÉMARRER LE SON</span>
              </>
            )}
          </button>

          {/* Master Volume Controls */}
          <div className="w-full sm:w-64 flex items-center gap-3.5 bg-slate-200/40 dark:bg-black/35 px-4 py-2.5 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <Volume2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <div className="flex-grow flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <span>VOL</span>
                <span className="font-semibold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

interface SoundPickerCardProps {
  activeSound: SoundType;
  onChangeSound: (type: SoundType) => void;
}

export const SoundPickerCard: React.FC<SoundPickerCardProps> = ({
  activeSound,
  onChangeSound,
}) => {
  const [isSoundPickerExpanded, setIsSoundPickerExpanded] = useState(true);

  const soundOptions: SoundOption[] = [
    {
      id: 'organic_rain',
      name: 'Averse Apaisante',
      englishName: 'Soothing Rain Wash',
      description: 'Stimulation Bilatérale Alternée naturelle et relaxante. Idéal pour apaiser l\'anxiété pendant la reconsolidation de la mémoire.',
      isIdeal: true,
    },
    {
      id: 'forest_birds',
      name: 'Forêt & Carillons',
      englishName: 'Mindful Chimes & Birds',
      description: 'Ambiance de nature sauvage mêlant carillons cristallins et gazouillis légers pour un ancrage cognitif positif et serein.',
      isIdeal: true,
    },
    {
      id: 'bowl_gong',
      name: 'Bol Tibétain Vibratoire',
      englishName: 'Vibrating Tibetan Bowl',
      description: 'Harmoniques riches et detunées créant un bourdonnement enveloppant pour une résonance cérébrale harmonisante.',
      isIdeal: true,
    },
    {
      id: 'heartbeat_sba',
      name: 'Battement de Cœur',
      englishName: 'Grounding Heartbeat',
      description: 'Le rythme rassurant d\'un cœur à 60 BPM. Idéal pour réduire les états d\'alerte et d\'hyperactivation nerveuse.',
      isIdeal: true,
    },
    {
      id: 'binaural_beat',
      name: 'Fréquence Sacrée 528 Hz',
      englishName: 'Solfeggio Healing 528Hz',
      description: 'Une fréquence pure résonant avec des harmoniques de soutien physique et mental, propice à la relaxation profonde.',
      isIdeal: true,
    },
    {
      id: 'handpan_sba',
      name: 'Handpan Méditatif',
      englishName: 'Meditative Handpan',
      description: 'Notes de métal sculpté douces et envoûtantes. Offre des harmoniques parfaites pour une double attention fluide et agréable.',
      isIdeal: true,
    },
    {
      id: 'hang_drum_sba',
      name: 'Hang Drum Profond',
      englishName: 'Deep Hang Drum',
      description: 'Sons de cupole chauds et profonds avec une résonance de basse apaisante, ralentissant naturellement le rythme cardiaque.',
      isIdeal: true,
    },
    {
      id: 'tongue_drum_sba',
      name: 'Tongue Drum Céleste',
      englishName: 'Celestial Tongue Drum',
      description: 'Pulsations cristallines et pures de cloches de bois et d\'acier. Extrêmement faciles à suivre mentalement de gauche à droite.',
      isIdeal: true,
    },
    {
      id: 'bol_tibetan_premium',
      name: 'Bol Tibétain Martelé',
      englishName: 'Struck Tibetan Singing Bowl',
      description: 'Frappe lente au maillet de feutre suivie d\'une vibration ondulatoire riche et sacrée. Idéal pour la désensibilisation lente.',
      isIdeal: true,
    },
    {
      id: 'kalimba_sba',
      name: 'Kalimba Féerique',
      englishName: 'Dreamy Kalimba',
      description: 'Tines métalliques douces pincées sur caisse boisée. Procure un sentiment d\'ancrage d\'enfance sécurisant.',
      isIdeal: true,
    },
  ];

  return (
    <div id="sound-picker-card" className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200/40 dark:border-white/10 p-5 shadow-xl transition-all duration-300 w-full animate-fadeIn">
      <button
        onClick={() => setIsSoundPickerExpanded(!isSoundPickerExpanded)}
        className="w-full flex items-center justify-between cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Music className="w-4 h-4" />
          </div>
          <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider text-left">
            Choix du Signal Sonore
          </h3>
        </div>
        <div className="text-slate-400 dark:text-slate-500">
          {isSoundPickerExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isSoundPickerExpanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {soundOptions.map((opt) => {
            const isSelected = activeSound === opt.id;
            return (
              <button
                key={opt.id}
                id={`sound-opt-${opt.id}`}
                onClick={() => onChangeSound(opt.id)}
                className={`w-full text-left py-3 px-4 rounded-2xl border transition-all duration-200 group flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-500/15 border-indigo-500/40 dark:bg-indigo-500/10 shadow-md'
                    : 'bg-white/60 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/60 dark:border-white/5'
                }`}
              >
                <div className="flex-grow pr-4">
                  <span className={`text-xs font-semibold tracking-wide ${
                    isSelected ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                  }`}>
                    {opt.name}
                  </span>
                </div>

                {/* Checklist Indicator */}
                <div className="shrink-0">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-300 dark:border-slate-700 group-hover:border-slate-400'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 fill-none stroke-current stroke-3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
