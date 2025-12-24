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

    // Validate adId to prevent XSS - should only contain alphanumeric characters, hyphens, and underscores
    const adIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!adIdPattern.test(adId)) {
      console.error('Invalid Adsterra ad ID format. Ad ID should only contain alphanumeric characters, hyphens, and underscores.');
      return;
    }

    const loadAdScript = () => {
      try {
        // For banner and native ads
        if (format === 'banner' || format === 'native') {
          // Create configuration script using textContent for safety
          const configScript = document.createElement('script');
          configScript.type = 'text/javascript';
          configScript.async = true;
          
          // Build configuration safely using textContent
          const config = {
            key: adId,
            format: 'iframe',
            height: format === 'banner' ? 90 : 250,
            width: format === 'banner' ? 728 : 300,
            params: {}
          };
          configScript.textContent = `atOptions = ${JSON.stringify(config)};`;
          
          // Create invoke script with validated URL
          const invokeScript = document.createElement('script');
          invokeScript.type = 'text/javascript';
          invokeScript.async = true;
          // Safely construct URL with validated adId
          const invokeUrl = `https://www.highperformanceformat.com/${encodeURIComponent(adId)}/invoke.js`;
          invokeScript.src = invokeUrl;
          
          if (adRef.current) {
            adRef.current.appendChild(configScript);
            adRef.current.appendChild(invokeScript);
          }
        } 
        // For popunder ads
        else if (format === 'popunder') {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.setAttribute('data-cfasync', 'false');
          // Safely construct URL with validated adId
          const popunderUrl = `https://www.highperformancedisplayformat.com/${encodeURIComponent(adId)}/invoke.js`;
          script.src = popunderUrl;
          
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
      // Cleanup: Remove all scripts when component unmounts
      // Using removeChild loop for better browser compatibility
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
