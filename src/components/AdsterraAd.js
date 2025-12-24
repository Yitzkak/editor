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

  useEffect(() => {
    // Check if ads are enabled via environment variable
    const adsEnabled = process.env.REACT_APP_ADSTERRA_ENABLED === 'true';
    
    if (!adsEnabled || !adId) {
      return;
    }

    // Validate adId to prevent XSS - should only contain alphanumeric characters and underscores
    const adIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!adIdPattern.test(adId)) {
      console.error('Invalid Adsterra ad ID format. Ad ID should only contain alphanumeric characters, hyphens, and underscores.');
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
          invokeScript.src = `https://www.highperformanceformat.com/${adId}/invoke.js`;
          invokeScript.async = true;
          
          if (adRef.current) {
            adRef.current.appendChild(script);
            adRef.current.appendChild(invokeScript);
          }
        } 
        // For popunder ads
        else if (format === 'popunder') {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          script.src = `https://www.highperformancedisplayformat.com/${adId}/invoke.js`;
          
          if (adRef.current) {
            adRef.current.appendChild(script);
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
