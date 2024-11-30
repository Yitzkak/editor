import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';
import "../App.css";

const AudioPlayer = forwardRef(({ audioFile, volume, amplification = 1, playbackSpeed }, ref) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const gainNode = useRef(null); // Gain node for volume boost

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#1d4ed8',
        progressColor: '#3b82f6',
        responsive: true,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        barHeight: 5,
        backend: 'WebAudio',
      });

      wavesurfer.current.on("ready", () => {
        const backend = wavesurfer.current.backend;
        if (backend && backend.ac) {
          const audioContext = backend.ac;
          gainNode.current = audioContext.createGain();
          backend.setFilter(gainNode.current);
          updateAmplification(amplification); // Initialize with provided amplification
        } else {
          console.error("WaveSurfer backend or AudioContext is not available.");
        }
      });

      // Create an element to display the time
    const hoverTime = document.createElement('div');
    hoverTime.style.position = 'absolute';
    hoverTime.style.backgroundColor = '#1361e1';
    hoverTime.style.color = '#fff';
    hoverTime.style.padding = '5px';
    hoverTime.style.borderRadius = '4px';
    hoverTime.style.display = 'none';  // Hide initially
    document.body.appendChild(hoverTime);

    // Add an event listener for mouse movement over the waveformRef container
    const handleMouseMove = (e) => {
        const rect = waveformRef.current.getBoundingClientRect();  // Get bounding box of the waveform container
        const x = e.clientX - rect.left;  // Calculate mouse position relative to the waveform
        const duration = wavesurfer.current.getDuration();  // Get audio duration
        const percent = x / rect.width;  // Calculate percent position of the mouse on the waveform
        const time = percent * duration;  // Convert percentage to time

        // Format time into MM:SS or HH:MM:SS
        const formattedTime = formatTime(time);

        // Position and display hover time
        hoverTime.style.left = `${e.pageX + 10}px`;
        hoverTime.style.top = `${e.pageY + 10}px`;
        hoverTime.style.display = 'block';
        hoverTime.style.zIndex = '9999';
        hoverTime.innerText = formattedTime;
    };

    const handleMouseOut = () => {
        hoverTime.style.display = 'none';  // Hide the hover time when mouse leaves the waveform
    };

    // Attach event listeners to the waveform container
    if (waveformRef.current) {
        waveformRef.current.addEventListener('mousemove', handleMouseMove);
        waveformRef.current.addEventListener('mouseout', handleMouseOut);
    }
      wavesurfer.current.on('ready', () => {
        // Ensure backend is initialized before accessing `ac`
        const backend = wavesurfer.current.backend;
        if (backend && backend.ac) {
          const audioContext = backend.ac; // Get AudioContext
          gainNode.current = audioContext.createGain(); // Assign to gainNode ref

          // Connect the WaveSurfer backend to the gain node
          backend.setFilter(gainNode.current);
        } else {
          console.error("WaveSurfer backend or AudioContext is not available.");
        }
      });
    }

    return () => wavesurfer.current?.destroy();
  }, []);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setPlaybackRate(playbackSpeed); // Set speed on WaveSurfer.js instance
    }
  }, [playbackSpeed]); // Re-run whenever playbackSpeed changes
  
  useEffect(() => {
    if (audioFile && wavesurfer.current) {
      const fileUrl = URL.createObjectURL(audioFile);
      wavesurfer.current.load(fileUrl);
    }
  }, [audioFile]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(volume); // Update Wavesurfer's volume
      console.log('useEffect in AudioPlayer', volume);
    }
  }, [volume]); 

  // Format time in HH:MM:SS or MM:SS format
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const timeString = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `0:${m}:${s.toString().padStart(2, '0')}`;
    return timeString;
  }

  const updateAmplification = (factor) => {
    if (gainNode.current) {
      gainNode.current.gain.value = factor;
    }
  };

  // Methods exposed to parent
  useImperativeHandle(ref, () => ({
    togglePlayPause: () => {
      if (wavesurfer.current) {
        if (wavesurfer.current.isPlaying()) {
          // Pause if currently playing
          wavesurfer.current.pause();
        } else {
          // Rewind 3 seconds if paused, then play
          const currentTime = wavesurfer.current.getCurrentTime();
          const duration = wavesurfer.current.getDuration();
          const newTime = Math.max(currentTime - 3, 0); // Ensure it doesn't go below 0
    
          // Calculate the percentage for the seekTo method
          const percentage = newTime / duration;
    
          wavesurfer.current.seekTo(percentage); // Move to the new time
          wavesurfer.current.play(); // Start playing
        }
      }
    },
    skipForward: (seconds) => {
      if (wavesurfer.current) {
          console.log('wavesurfer: Current time', wavesurfer.current.getCurrentTime());
          const currentPosition = wavesurfer.current.getCurrentTime(); // Current time in seconds
          const duration = wavesurfer.current.getDuration(); // Total audio duration in seconds
          const newPosition = Math.min(currentPosition + seconds, duration); // Ensure not to skip beyond the track
  
          wavesurfer.current.seekTo(newPosition / duration); // seekTo expects a value between 0 and 1
      }
    },
  
    skipBack: (seconds) => {
      if (wavesurfer.current) {
          console.log('wavesurfer: Back Current time', wavesurfer.current.getCurrentTime());
          console.log('wavesurfer: skipping forward', wavesurfer.current);
          const currentPosition = wavesurfer.current.getCurrentTime();
          const newPosition = Math.max(currentPosition - seconds, 0); // Ensure not to skip before the track starts
  
          wavesurfer.current.seekTo(newPosition / wavesurfer.current.getDuration());
      }
    },
    seekTo: (time) => {
      if (wavesurfer.current) {
        const duration = wavesurfer.current.getDuration();
        if (duration > 0) {
          const position = time / duration; // Convert time to fraction
          wavesurfer.current.seekTo(position);
          // Explicitly pause if seeking to the exact end
          if (position === 1) {
            wavesurfer.current.pause();
          }
        }
      }
    },
    goToEnd: () => {
      if (wavesurfer.current) {
        const duration = wavesurfer.current.getDuration();
        wavesurfer.current.seekTo(1); // Move to the end of the audio
        wavesurfer.current.pause(); // Stop playback at the end
      }
    },
    getCurrentTime: () => wavesurfer.current?.getCurrentTime() || 0,
    getDuration: () => wavesurfer.current?.getDuration() || 0,
    pauseAudio: () => wavesurfer.current?.pause(),
    getTimestamp: () => {
      if (wavesurfer.current) {
        const currentTime = wavesurfer.current.getCurrentTime();
        const hours = Math.floor(currentTime / 3600);
        const minutes = Math.floor((currentTime % 3600) / 60);
        const seconds = (currentTime % 60).toFixed(1);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(4, '0')}`;
      }
      return "0:00:00.0";
    },
    updateAmplification,
  }));

  return (
    <div className="w-full">
      {/* Wrapper for overlaying the WaveSurfer waveform inside the placeholder */}
      <div className="waveform-wrapper relative w-full h-16 bg-gray-100 rounded-md">
        
        {/* Placeholder Waveform Bars */}
        <div className="placeholder-waveform absolute inset-0 flex gap-1 items-center justify-center opacity-50 pointer-events-none">
          {[...Array(50)].map((_, index) => (
            <div key={index} className="placeholder-bar"></div>
          ))}
        </div>
        
        {/* Actual WaveSurfer Waveform */}
        <div ref={waveformRef} className="absolute inset-0 waveform-container"></div>
        
      </div>
    </div>
  );
});

export default AudioPlayer;
