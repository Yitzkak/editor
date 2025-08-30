import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import "../App.css";

const MediaPlayer = forwardRef(({ mediaFile, volume, amplification = 1, speed, setAudioLoading, onWaveformClick }, ref) => {
  const waveformRef = useRef(null);
  const videoRef = useRef(null);
  const wavesurfer = useRef(null);
  const gainNode = useRef(null);
  const [isVideo, setIsVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  
  // Drag functionality state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const videoContainerRef = useRef(null);

  // Resize functionality state
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [resizeDirection, setResizeDirection] = useState('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Check if file is video
  const checkIfVideo = (file) => {
    return file.type.startsWith('video/');
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (!isVideo) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isVideo) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep video within viewport bounds
    const maxX = window.innerWidth - size.width;
    const maxY = window.innerHeight - size.height;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection('');
  };

  // Resize handlers
  const handleResizeStart = (e, direction) => {
    if (!isVideo) return;
    
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !isVideo) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;

    // Calculate new dimensions based on resize direction
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(300, Math.min(800, resizeStart.width + deltaX));
    }
    if (resizeDirection.includes('w')) {
      const widthChange = Math.max(-resizeStart.width + 300, Math.min(0, -deltaX));
      newWidth = Math.max(300, Math.min(800, resizeStart.width - widthChange));
      const newX = position.x + (resizeStart.width - newWidth);
      setPosition(prev => ({ ...prev, x: newX }));
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(200, Math.min(600, resizeStart.height + deltaY));
    }
    if (resizeDirection.includes('n')) {
      const heightChange = Math.max(-resizeStart.height + 200, Math.min(0, -deltaY));
      newHeight = Math.max(200, Math.min(600, resizeStart.height - heightChange));
      const newY = position.y + (resizeStart.height - newHeight);
      setPosition(prev => ({ ...prev, y: newY }));
    }

    setSize({ width: newWidth, height: newHeight });
  };

  // Add global mouse event listeners for dragging and resizing
  useEffect(() => {
    if (isVideo) {
      document.addEventListener('mousemove', isResizing ? handleResizeMove : handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', isResizing ? handleResizeMove : handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeDirection, resizeStart, isVideo]);

  const initializeWaveSurfer = () => {
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
        backend: 'MediaElement',
      });

      wavesurfer.current.on("ready", () => {
        const backend = wavesurfer.current.backend;
        if (backend && typeof backend.getMediaElement === "function") {
          const audio = backend.getMediaElement();
          if (audio) {
            audio.preservesPitch = true;
          }
        }
        
        if (backend && backend.ac) {
          const audioContext = backend.ac;
          gainNode.current = audioContext.createGain();
          backend.setFilter(gainNode.current);
          updateAmplification(amplification);
        }
      });

      // Create hover time display
      const hoverTime = document.createElement('div');
      hoverTime.style.position = 'absolute';
      hoverTime.style.backgroundColor = '#1361e1';
      hoverTime.style.color = '#fff';
      hoverTime.style.padding = '5px';
      hoverTime.style.borderRadius = '4px';
      hoverTime.style.display = 'none';
      document.body.appendChild(hoverTime);

      const handleWaveformMouseMove = (e) => {
        const rect = waveformRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const duration = wavesurfer.current.getDuration();
        const percent = x / rect.width;
        const time = percent * duration;
        const formattedTime = formatTime(time);

        hoverTime.style.left = `${e.pageX + 10}px`;
        hoverTime.style.top = `${e.pageY + 10}px`;
        hoverTime.style.display = 'block';
        hoverTime.style.zIndex = '9999';
        hoverTime.innerText = formattedTime;
      };

      const handleWaveformMouseOut = () => {
        hoverTime.style.display = 'none';
      };

      const handleWaveformClick = (e) => {
        if (wavesurfer.current && onWaveformClick) {
          const rect = waveformRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const duration = wavesurfer.current.getDuration();
          const percent = x / rect.width;
          const time = percent * duration;
          onWaveformClick(time);
        }
      };

      if (waveformRef.current) {
        waveformRef.current.addEventListener('mousemove', handleWaveformMouseMove);
        waveformRef.current.addEventListener('mouseout', handleWaveformMouseOut);
        waveformRef.current.addEventListener('click', handleWaveformClick);
      }
    }
  };

  useEffect(() => {
    if (mediaFile) {
      const isVideoFile = checkIfVideo(mediaFile);
      setIsVideo(isVideoFile);
      
      if (isVideoFile) {
        // For video files, create a URL for the video element
        const url = URL.createObjectURL(mediaFile);
        setVideoUrl(url);
        if (setAudioLoading) setAudioLoading(false);
        
        // Initialize WaveSurfer for video audio
        if (waveformRef.current && !wavesurfer.current) {
          initializeWaveSurfer();
        }
        if (wavesurfer.current) {
          wavesurfer.current.load(url);
          if (setAudioLoading) setAudioLoading(true);
          wavesurfer.current.once('ready', () => {
            if (setAudioLoading) setAudioLoading(false);
          });
        }
      } else {
        // For audio files, use WaveSurfer as before
        if (waveformRef.current && !wavesurfer.current) {
          initializeWaveSurfer();
        }
        if (wavesurfer.current) {
          const fileUrl = URL.createObjectURL(mediaFile);
          wavesurfer.current.load(fileUrl);
          if (setAudioLoading) setAudioLoading(true);
          wavesurfer.current.once('ready', () => {
            if (setAudioLoading) setAudioLoading(false);
          });
        }
      }
    }

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [mediaFile]);

  useEffect(() => {
    if (waveformRef.current && !wavesurfer.current) {
      initializeWaveSurfer();
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
        wavesurfer.current = null;
      }
    };
  }, []);

  // Sync video playback with waveform
  useEffect(() => {
    if (isVideo && videoRef.current && wavesurfer.current) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        if (wavesurfer.current && !wavesurfer.current.isPlaying()) {
          const currentTime = video.currentTime;
          const duration = video.duration;
          if (duration > 0) {
            const progress = currentTime / duration;
            wavesurfer.current.seekTo(progress);
          }
        }
      };

      const handlePlay = () => {
        if (wavesurfer.current) {
          wavesurfer.current.play();
        }
      };

      const handlePause = () => {
        if (wavesurfer.current) {
          wavesurfer.current.pause();
        }
      };

      const handleSeeked = () => {
        if (wavesurfer.current) {
          const currentTime = video.currentTime;
          const duration = video.duration;
          if (duration > 0) {
            const progress = currentTime / duration;
            wavesurfer.current.seekTo(progress);
          }
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('seeked', handleSeeked);
      };
    }
  }, [isVideo, videoRef.current, wavesurfer.current]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setPlaybackRate(speed);
    }
    if (videoRef.current && isVideo) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed, isVideo]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(volume);
    }
    if (videoRef.current && isVideo) {
      videoRef.current.volume = volume;
    }
  }, [volume, isVideo]);

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const timeString = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `0:${m}:${s.toString().padStart(2, '0')}`;
    return timeString;
  }

  const updateAmplification = (factor) => {
    if (gainNode.current) {
      gainNode.current.gain.value = Math.max(factor, 1);
    }
  };

  // Video-specific methods
  const getVideoCurrentTime = () => videoRef.current?.currentTime || 0;
  const getVideoDuration = () => videoRef.current?.duration || 0;
  const isVideoPlaying = () => !videoRef.current?.paused;
  const playVideo = () => videoRef.current?.play();
  const pauseVideo = () => videoRef.current?.pause();
  const seekVideo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Methods exposed to parent
  useImperativeHandle(ref, () => ({
    togglePlayPause: () => {
      if (isVideo) {
        if (isVideoPlaying()) {
          pauseVideo();
        } else {
          const currentTime = getVideoCurrentTime();
          const newTime = Math.max(currentTime - 3, 0);
          seekVideo(newTime);
          playVideo();
        }
      } else if (wavesurfer.current) {
        if (wavesurfer.current.isPlaying()) {
          wavesurfer.current.pause();
        } else {
          const currentTime = wavesurfer.current.getCurrentTime();
          const duration = wavesurfer.current.getDuration();
          const newTime = Math.max(currentTime - 3, 0);
          const percentage = newTime / duration;
          wavesurfer.current.seekTo(percentage);
          wavesurfer.current.play();
        }
      }
    },
    skipForward: (seconds) => {
      if (isVideo) {
        const currentPosition = getVideoCurrentTime();
        const duration = getVideoDuration();
        const newPosition = Math.min(currentPosition + seconds, duration);
        seekVideo(newPosition);
      } else if (wavesurfer.current) {
        const currentPosition = wavesurfer.current.getCurrentTime();
        const duration = wavesurfer.current.getDuration();
        const newPosition = Math.min(currentPosition + seconds, duration);
        wavesurfer.current.seekTo(newPosition / duration);
      }
    },
    skipBack: (seconds) => {
      if (isVideo) {
        const currentPosition = getVideoCurrentTime();
        const newPosition = Math.max(currentPosition - seconds, 0);
        seekVideo(newPosition);
      } else if (wavesurfer.current) {
        const currentPosition = wavesurfer.current.getCurrentTime();
        const newPosition = Math.max(currentPosition - seconds, 0);
        wavesurfer.current.seekTo(newPosition / wavesurfer.current.getDuration());
      }
    },
    seekTo: (time) => {
      if (isVideo) {
        seekVideo(time);
      } else if (wavesurfer.current) {
        const duration = wavesurfer.current.getDuration();
        if (duration > 0) {
          const position = time / duration;
          wavesurfer.current.seekTo(position);
          if (position === 1) {
            wavesurfer.current.pause();
          }
        }
      }
    },
    goToEnd: () => {
      if (isVideo) {
        const duration = getVideoDuration();
        seekVideo(duration);
        pauseVideo();
      } else if (wavesurfer.current) {
        const duration = wavesurfer.current.getDuration();
        wavesurfer.current.seekTo(1);
        wavesurfer.current.pause();
      }
    },
    getCurrentTime: () => {
      if (isVideo) {
        return getVideoCurrentTime();
      } else {
        return wavesurfer.current?.getCurrentTime() || 0;
      }
    },
    getDuration: () => {
      if (isVideo) {
        return getVideoDuration();
      } else {
        return wavesurfer.current?.getDuration() || 0;
      }
    },
    pauseAudio: () => {
      if (isVideo) {
        pauseVideo();
      } else {
        wavesurfer.current?.pause();
      }
    },
    playAudio: () => {
      if (isVideo) {
        playVideo();
      } else {
        wavesurfer.current?.play();
      }
    },
    getTimestamp: () => {
      const currentTime = isVideo ? getVideoCurrentTime() : (wavesurfer.current?.getCurrentTime() || 0);
      const hours = Math.floor(currentTime / 3600);
      const minutes = Math.floor((currentTime % 3600) / 60);
      const seconds = (currentTime % 60).toFixed(1);
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(4, '0')}`;
    },
    updateAmplification,
  }));

  if (isVideo) {
    return (
      <div 
        ref={videoContainerRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border-2 border-gray-300 cursor-move"
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Drag handle */}
        <div className="bg-gray-100 px-3 py-2 rounded-t-lg border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm text-gray-600 font-medium">Video Player</span>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
        
        {/* Video element */}
        <div className="flex-1 overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            controls={false}
            muted={true}
            onLoadedMetadata={() => {
              if (setAudioLoading) setAudioLoading(false);
            }}
          />
        </div>
        
        {/* Waveform below video */}
        <div className="waveform-wrapper relative w-full h-16 bg-gray-100 rounded-b-lg">
          <div ref={waveformRef} className="absolute inset-0 waveform-container"></div>
        </div>

        {/* Resize handles */}
        <div 
          className="absolute top-0 right-0 w-3 h-3 cursor-se-resize"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
        <div 
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
        <div 
          className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          className="absolute top-0 left-1/2 w-3 h-3 cursor-n-resize transform -translate-x-1/2"
          onMouseDown={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          className="absolute bottom-0 left-1/2 w-3 h-3 cursor-s-resize transform -translate-x-1/2"
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className="absolute left-0 top-1/2 w-3 h-3 cursor-w-resize transform -translate-y-1/2"
          onMouseDown={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          className="absolute right-0 top-1/2 w-3 h-3 cursor-e-resize transform -translate-y-1/2"
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="waveform-wrapper relative w-full h-16 bg-gray-100 rounded-md">
        <div className="placeholder-waveform absolute inset-0 flex gap-1 items-center justify-center opacity-50 pointer-events-none">
          {[...Array(50)].map((_, index) => (
            <div key={index} className="placeholder-bar"></div>
          ))}
        </div>
        <div ref={waveformRef} className="absolute inset-0 waveform-container"></div>
      </div>
    </div>
  );
});

export default MediaPlayer;
