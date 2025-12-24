import React, { useEffect, useRef } from 'react';

/**
 * AdsterraAd Component
 * 
 * A React component for displaying Adsterra ads in the Scriptorfi Editor.
 * Supports multiple ad formats: banner, native, and popunder.
 * 
 * Usage:
 * <AdsterraAd 
 *   adId="your_ad_id_here" 
 *   format="banner" 
 *   className="my-custom-class"
 * />
 */
const AdsterraAd = ({ adId, format = 'banner', className = '' }) => {
  const adRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Check if ads are enabled via environment variable
    const adsEnabled = process.env.REACT_APP_ADSTERRA_ENABLED === 'true';
    
    if (!adsEnabled || !adId) {
      return;
    }

    // Prevent loading the same script multiple times
    if (scriptLoadedRef.current) {
      return;
    }

    const loadAdScript = () => {
      try {
        // For banner and native ads
        if (format === 'banner' || format === 'native') {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          
          // Adsterra ad script configuration
          script.innerHTML = `
            atOptions = {
              'key' : '${adId}',
              'format' : 'iframe',
              'height' : ${format === 'banner' ? 90 : 250},
              'width' : ${format === 'banner' ? 728 : 300},
              'params' : {}
            };
          `;
          
          const invokeScript = document.createElement('script');
          invokeScript.type = 'text/javascript';
          invokeScript.src = `//www.highperformanceformat.com/${adId}/invoke.js`;
          invokeScript.async = true;
          
          if (adRef.current) {
            adRef.current.appendChild(script);
            adRef.current.appendChild(invokeScript);
            scriptLoadedRef.current = true;
          }
        } 
        // For popunder ads
        else if (format === 'popunder') {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          script.src = `//www.highperformancedisplayformat.com/${adId}/invoke.js`;
          
          if (adRef.current) {
            adRef.current.appendChild(script);
            scriptLoadedRef.current = true;
          }
        }
      } catch (error) {
        console.error('Error loading Adsterra ad:', error);
      }
    };

    // Load ad after a small delay to ensure page is ready
    const timer = setTimeout(loadAdScript, 100);

    return () => {
      clearTimeout(timer);
      // Cleanup: Remove scripts when component unmounts
      if (adRef.current) {
        while (adRef.current.firstChild) {
          adRef.current.removeChild(adRef.current.firstChild);
        }
      }
      scriptLoadedRef.current = false;
    };
  }, [adId, format]);

  // Don't render anything if ads are disabled
  if (process.env.REACT_APP_ADSTERRA_ENABLED !== 'true' || !adId) {
    return null;
  }

  // Different styling based on ad format
  const getAdStyles = () => {
    const baseStyles = 'adsterra-ad flex justify-center items-center my-4';
    
    switch (format) {
      case 'banner':
        return `${baseStyles} min-h-[90px] ${className}`;
      case 'native':
        return `${baseStyles} min-h-[250px] ${className}`;
      case 'popunder':
        return `${baseStyles} hidden ${className}`;
      default:
        return `${baseStyles} ${className}`;
    }
  };

  return (
    <div 
      ref={adRef} 
      className={getAdStyles()}
      data-ad-format={format}
      data-ad-id={adId}
    />
  );
};

export default AdsterraAd;
