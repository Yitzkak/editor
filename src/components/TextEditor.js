import React, { useRef, useEffect } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';  // For snow theme, or use 'quill.bubble.css' for bubble theme

const TextEditor = () => {
    const editorRef = useRef(null);
  
    useEffect(() => {
      if (editorRef.current) {
        new Quill(editorRef.current, {
          theme: 'snow',  // Choose 'bubble' for bubble theme
          modules: {
            toolbar: [
              [{ 'header': [1, 2, false] }],
              ['bold', 'italic', 'underline'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              ['clean']  // Remove formatting button
            ]
          }
        });
      }
    }, []);
  
    return <div ref={editorRef} className="my-4"></div>;
};
  
export default TextEditor;
  