import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import "../App.css";

const MediaPlayer = forwardRef(({ mediaFile, volume, amplification = 1, speed, performanceMode = false, setAudioLoading, onWaveformClick }, ref) => {
  const waveformRef = useRef(null);
  const videoRef = useRef(null);
  const longAudioRef = useRef(null);
  const longAudioUrlRef = useRef(null);
  const wavesurfer = useRef(null);
  const gainNode = useRef(null);
  const [isLongAudioReady, setIsLongAudioReady] = useState(false);
  const wrapperRef = useRef(null);
  const [placeholderBarCount, setPlaceholderBarCount] = useState(120);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.log('[MediaPlayer] mediaFile set. isVideo:', isVideoFile, 'performanceMode:', performanceMode);
      
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
        // Audio file
        const fileUrl = URL.createObjectURL(mediaFile);
        if (performanceMode) {
          // Use hidden HTMLAudioElement for long files; show loading until metadata ready
          console.log('[MediaPlayer] Performance mode: setting audio src and showing loader');
          if (setAudioLoading) setAudioLoading(true);
          setIsLongAudioReady(false);
          if (longAudioRef.current) {
            // cleanup old URL if any
            if (longAudioUrlRef.current) {
              try { URL.revokeObjectURL(longAudioUrlRef.current); } catch (e) {}
            }
            longAudioUrlRef.current = fileUrl;
            longAudioRef.current.src = fileUrl;
            const loadStart = Date.now();
            const hideLoader = () => {
              const elapsed = Date.now() - loadStart;
              const remaining = Math.max(0, 500 - elapsed); // ensure min 500ms to avoid flicker
              setTimeout(() => {
                if (setAudioLoading) setAudioLoading(false);
              }, remaining);
            };
            const onCanPlayThrough = () => {
              console.log('[MediaPlayer] long audio canplaythrough. duration:', longAudioRef.current?.duration);
              hideLoader();
              setIsLongAudioReady(true);
              longAudioRef.current?.removeEventListener('canplaythrough', onCanPlayThrough);
              longAudioRef.current?.removeEventListener('error', onError);
            };
            const onError = (e) => {
              console.error('[MediaPlayer] long audio error', e);
              if (setAudioLoading) setAudioLoading(false);
              setIsLongAudioReady(false);
              longAudioRef.current?.removeEventListener('canplaythrough', onCanPlayThrough);
              longAudioRef.current?.removeEventListener('error', onError);
            };
            longAudioRef.current.addEventListener('canplaythrough', onCanPlayThrough);
            longAudioRef.current.addEventListener('error', onError);
          }
        } else {
          if (waveformRef.current && !wavesurfer.current) {
            initializeWaveSurfer();
          }
          if (wavesurfer.current) {
            wavesurfer.current.load(fileUrl);
            console.log('[MediaPlayer] WaveSurfer loading start');
            if (setAudioLoading) setAudioLoading(true);
            wavesurfer.current.once('ready', () => {
              console.log('[MediaPlayer] WaveSurfer ready');
              if (setAudioLoading) setAudioLoading(false);
            });
          }
        }
      }
    }

    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (longAudioUrlRef.current) {
        try { URL.revokeObjectURL(longAudioUrlRef.current); } catch (e) {}
        longAudioUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFile]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, videoRef.current, wavesurfer.current]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setPlaybackRate(speed);
    }
    if (videoRef.current && isVideo) {
      videoRef.current.playbackRate = speed;
    }
    if (longAudioRef.current && !isVideo && performanceMode) {
      console.log('[MediaPlayer] set long audio playbackRate:', speed);
      longAudioRef.current.playbackRate = speed;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, isVideo]);

  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(volume);
    }
    if (videoRef.current && isVideo) {
      videoRef.current.volume = volume;
    }
    if (longAudioRef.current && !isVideo && performanceMode) {
      console.log('[MediaPlayer] set long audio volume:', volume);
      longAudioRef.current.volume = volume;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isVideo]);

  // Compute placeholder bar count to fill the available width
  useEffect(() => {
    const computeBarCount = () => {
      const width = wrapperRef.current?.clientWidth || 0;
      const barWidth = 2; // px
      const gap = 2; // px
      const padding = 16; // px (px-2 left+right in placeholder container)
      const effectiveWidth = Math.max(0, width - padding);
      const count = Math.max(60, Math.min(400, Math.floor(effectiveWidth / (barWidth + gap))));
      setPlaceholderBarCount(count || 60);
    };
    computeBarCount();
    window.addEventListener('resize', computeBarCount);
    return () => window.removeEventListener('resize', computeBarCount);
  }, []);

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
      } else if (performanceMode && longAudioRef.current) {
        const a = longAudioRef.current;
        if (!a.paused) {
          a.pause();
        } else {
          const currentTime = a.currentTime || 0;
          const newTime = Math.max(currentTime - 3, 0);
          a.currentTime = newTime;
          a.play();
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
      } else if (performanceMode && longAudioRef.current) {
        const a = longAudioRef.current;
        const duration = a.duration || 0;
        const newPosition = Math.min((a.currentTime || 0) + seconds, duration);
        a.currentTime = newPosition;
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
      } else if (performanceMode && longAudioRef.current) {
        const a = longAudioRef.current;
        const newPosition = Math.max((a.currentTime || 0) - seconds, 0);
        a.currentTime = newPosition;
      } else if (wavesurfer.current) {
        const currentPosition = wavesurfer.current.getCurrentTime();
        const newPosition = Math.max(currentPosition - seconds, 0);
        wavesurfer.current.seekTo(newPosition / wavesurfer.current.getDuration());
      }
    },
    seekTo: (time) => {
      if (isVideo) {
        seekVideo(time);
      } else if (performanceMode && longAudioRef.current) {
        const a = longAudioRef.current;
        a.currentTime = Math.max(0, Math.min(time, a.duration || Infinity));
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
      } else if (performanceMode && longAudioRef.current) {
        const a = longAudioRef.current;
        a.currentTime = a.duration || 0;
        a.pause();
      } else if (wavesurfer.current) {
        wavesurfer.current.seekTo(1);
        wavesurfer.current.pause();
      }
    },
    getCurrentTime: () => {
      if (isVideo) {
        return getVideoCurrentTime();
      } else if (performanceMode && longAudioRef.current) {
        return longAudioRef.current.currentTime || 0;
      } else {
        return wavesurfer.current?.getCurrentTime() || 0;
      }
    },
    getDuration: () => {
      if (isVideo) {
        return getVideoDuration();
      } else if (performanceMode && longAudioRef.current) {
        return longAudioRef.current.duration || 0;
      } else {
        return wavesurfer.current?.getDuration() || 0;
      }
    },
    pauseAudio: () => {
      if (isVideo) {
        pauseVideo();
      } else if (performanceMode && longAudioRef.current) {
        longAudioRef.current.pause();
      } else {
        wavesurfer.current?.pause();
      }
    },
    playAudio: () => {
      if (isVideo) {
        playVideo();
      } else if (performanceMode && longAudioRef.current) {
        longAudioRef.current.play();
      } else {
        wavesurfer.current?.play();
      }
    },
    getTimestamp: () => {
      const currentTime = isVideo
        ? getVideoCurrentTime()
        : (performanceMode && longAudioRef.current
            ? (longAudioRef.current.currentTime || 0)
            : (wavesurfer.current?.getCurrentTime() || 0));
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
      {/* Hidden audio element for performance mode long audio */}
      {performanceMode && !isVideo && (
        <audio
          ref={longAudioRef}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}
      <div ref={wrapperRef} className="waveform-wrapper relative w-full h-16 bg-gray-100 rounded-md">
        {performanceMode ? (
          <>
            {/* Lightweight placeholder waveform when long audio is ready */}
            {isLongAudioReady ? (
              <div className="absolute inset-0 flex items-end gap-[2px] px-2 py-3">
                {[...Array(placeholderBarCount)].map((_, i) => {
                  const height = 10 + ((i * 37) % 48); // pseudo-random deterministic heights 10-58
                  return (
                    <div
                      key={i}
                      style={{ height: `${height}px`, width: '2px', backgroundColor: '#3b82f6', borderRadius: '2px', opacity: 0.9 }}
                    />
                  );
                })}
                {/* Ready badge */}
                <div className="absolute top-1 right-1 text-[10px] px-2 py-[2px] rounded bg-green-100 text-green-700 border border-green-200">
                  Ready
                </div>
              </div>
            ) : (
              // Before ready: show subtle skeleton bars
              <div className="placeholder-waveform absolute inset-0 flex gap-1 items-center justify-center opacity-50 pointer-events-none">
                {[...Array(placeholderBarCount)].map((_, index) => (
                  <div key={index} className="placeholder-bar"></div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="placeholder-waveform absolute inset-0 flex gap-1 items-center justify-center opacity-50 pointer-events-none">
              {[...Array(50)].map((_, index) => (
                <div key={index} className="placeholder-bar"></div>
              ))}
            </div>
            <div ref={waveformRef} className="absolute inset-0 waveform-container"></div>
          </>
        )}
      </div>
    </div>
  );
});

export default MediaPlayer;
