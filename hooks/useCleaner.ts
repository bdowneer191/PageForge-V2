
import { useState, useCallback } from 'react';
import { rewriteToSemanticHtml } from '../services/geminiService.ts';
import { CleaningOptions, ImpactSummary, Recommendation } from '../types.ts';

// A lightweight version of some of the cleaner functions
// to make the hook self-contained and fix compilation errors.
const minifyCss = (css: string) => css.replace(/\s*([:;{}])\s*/g, "$1").replace(/\s\s+/g, ' ');
const minifyJs = (js: string) => {
    // Basic JS minification, not as robust as a real minifier
    let minified = js.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''); // remove comments
    minified = minified.replace(/\s*([=;,{}\(\)\[\]])\s*/g, '$1'); // remove spaces around operators
    minified = minified.replace(/\s+/g, ' '); // collapse whitespace
    return minified;
};

const getLazyLoadScript = () => `
(function() {
    function loadEmbed(placeholder) {
        // The original embed code is stored in a template tag
        var template = placeholder.querySelector('template');
        if (template && template.innerHTML) {
            var tempDiv = document.createElement('div');
            // Use the outerHTML of the first child of the template's content
            tempDiv.innerHTML = template.content.firstElementChild.outerHTML;
            var newElement = tempDiv.firstElementChild;
            
            if (newElement) {
                placeholder.parentNode.replaceChild(newElement, placeholder);
                // For script-based embeds (Twitter, Insta), their loader script
                // might need to be re-run or re-inserted to process the new element.
                // A common trick is to re-insert the platform's script tag.
                var platformScript = newElement.querySelector('script');
                if(platformScript && platformScript.src) {
                     var newScript = document.createElement('script');
                     newScript.src = platformScript.src;
                     newScript.async = true;
                     document.body.appendChild(newScript);
                }
            }
        }
    }

    document.addEventListener('click', function(e) {
        // Use .closest() to find the trigger button, allowing clicks on text/icons inside
        var trigger = e.target.closest('.pf-lazy-load-trigger');
        if (trigger) {
            e.preventDefault();
            var placeholder = trigger.closest('.pf-lazy-embed');
            if (placeholder) {
                loadEmbed(placeholder);
            }
        }
    }, false);
})();
`;

const createEmbedPlaceholder = (doc: Document, originalElement: HTMLElement, platform: 'youtube' | 'instagram' | 'twitter' | 'tiktok'): HTMLElement => {
    const placeholder = doc.createElement('div');
    placeholder.className = `pf-lazy-embed pf-lazy-embed-${platform}`;
    placeholder.setAttribute('style', 'position: relative; border: 1px solid #374151; border-radius: 0.5rem; background-color: #111827; overflow: hidden; min-height: 250px; display: flex; align-items: center; justify-content: center; text-align: center; color: #d1d5db;');

    const template = doc.createElement('template');
    template.content.appendChild(originalElement.cloneNode(true));
    placeholder.appendChild(template);

    const trigger = doc.createElement('div');
    trigger.className = 'pf-lazy-load-trigger';
    trigger.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); background-color: rgba(0,0,0,0.6); transition: background-color 0.2s ease;');
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    trigger.innerHTML = `
        <div style="font-family: sans-serif;">
            <p style="font-weight: 600; font-size: 1.125rem; color: white;">Load ${platformName} Content</p>
            <p style="font-size: 0.875rem; margin-top: 0.25rem; color: #d1d5db;">Click to view this embed and improve page speed.</p>
            <span style="display: inline-block; margin-top: 1rem; padding: 0.5rem 1rem; background-color: #2563eb; color: white; border: none; border-radius: 0.375rem; font-weight: 600;">Load Content</span>
        </div>
    `;
    
    if (platform === 'youtube') {
        try {
            const videoId = new URL(originalElement.getAttribute('src')!).pathname.split('/').pop();
            if (videoId) {
                const thumb = doc.createElement('img');
                thumb.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                thumb.alt = 'YouTube video thumbnail';
                thumb.setAttribute('style', 'width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; transition: transform 0.2s ease;');
                placeholder.appendChild(thumb);
            }
        } catch (e) { console.warn("Could not parse YouTube URL for thumbnail."); }
    } else {
        placeholder.style.minHeight = '400px';
    }

    placeholder.appendChild(trigger);
    return placeholder;
};


const useCleaner = () => {
  const [isCleaning, setIsCleaning] = useState(false);

  const cleanHtml = useCallback(async (
    originalHtml: string, 
    userOptions: CleaningOptions,
    sessionId: string
  ): Promise<{ cleanedHtml: string, summary: ImpactSummary, effectiveOptions: CleaningOptions }> => {
    setIsCleaning(true);

    const parser = new DOMParser();
    const doc = parser.parseFromString(originalHtml, 'text/html');
    const effectiveOptions = { ...userOptions };
    let nodesRemoved = 0;
    let embedsFound = false;

    // Handle lazy loading embeds first as a separate, structural pass
    if (effectiveOptions.lazyLoadEmbeds) {
        const replacements: { old: HTMLElement, new: HTMLElement }[] = [];
        
        // YouTube
        doc.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(el => {
            replacements.push({ old: el as HTMLElement, new: createEmbedPlaceholder(doc, el as HTMLElement, 'youtube')});
            embedsFound = true;
        });
        // Instagram
        doc.querySelectorAll('blockquote.instagram-media').forEach(el => {
            replacements.push({ old: el as HTMLElement, new: createEmbedPlaceholder(doc, el as HTMLElement, 'instagram')});
            embedsFound = true;
        });
        // Twitter
        doc.querySelectorAll('blockquote.twitter-tweet').forEach(el => {
            replacements.push({ old: el as HTMLElement, new: createEmbedPlaceholder(doc, el as HTMLElement, 'twitter')});
            embedsFound = true;
        });
        // TikTok
        doc.querySelectorAll('blockquote.tiktok-embed').forEach(el => {
            replacements.push({ old: el as HTMLElement, new: createEmbedPlaceholder(doc, el as HTMLElement, 'tiktok')});
            embedsFound = true;
        });
        
        replacements.forEach(rep => rep.old.parentNode?.replaceChild(rep.new, rep.old));
    }

    const processNode = (node: Node) => {
      if (node.nodeType === Node.COMMENT_NODE && effectiveOptions.stripComments) {
        node.parentNode?.removeChild(node);
        nodesRemoved++;
        return;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (effectiveOptions.minifyInlineCSSJS) {
            if (element.tagName.toLowerCase() === 'style' && element.textContent) {
                element.textContent = minifyCss(element.textContent);
            }
            if (element.tagName.toLowerCase() === 'script' && !element.hasAttribute('src') && element.textContent) {
                try {
                    element.textContent = minifyJs(element.textContent);
                } catch (e) {
                    console.warn('Skipping JS minification for a script due to error.', e);
                }
            }
            const styleAttr = element.getAttribute('style');
            if (styleAttr) {
                element.setAttribute('style', minifyCss(styleAttr));
            }
        }

        if (effectiveOptions.removeEmptyAttributes) {
          Array.from(element.attributes).forEach(attr => {
            if (attr.value.trim() === '') element.removeAttribute(attr.name);
          });
        }
      }

      if (node.nodeType === Node.TEXT_NODE && effectiveOptions.collapseWhitespace) {
        if (node.parentNode && !['STYLE', 'SCRIPT', 'PRE', 'CODE'].includes(node.parentNode.nodeName)) {
            node.textContent = node.textContent?.replace(/[\t\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim() || '';
        }
      }
      
      Array.from(node.childNodes).forEach(child => processNode(child));
    };

    processNode(doc.documentElement);
    
    if (effectiveOptions.semanticRewrite) {
        doc.body.innerHTML = await rewriteToSemanticHtml(doc.body.innerHTML, sessionId);
    }
    
    if (embedsFound) {
        const scriptEl = doc.createElement('script');
        scriptEl.textContent = getLazyLoadScript();
        doc.body.appendChild(scriptEl);
    }
    
    let cleanedResult = new XMLSerializer().serializeToString(doc);

    if (!cleanedResult.toLowerCase().startsWith('<!doctype') && originalHtml.toLowerCase().includes('<!doctype html>')) {
        cleanedResult = '<!DOCTYPE html>\n' + cleanedResult;
    }

    const summary: ImpactSummary = {
        originalBytes: originalHtml.length,
        cleanedBytes: cleanedResult.length,
        bytesSaved: originalHtml.length - cleanedResult.length,
        nodesRemoved,
        estimatedSpeedGain: 'N/A'
    };

    setIsCleaning(false);
    
    return { cleanedHtml: cleanedResult, summary, effectiveOptions };
  }, []);

  return { isCleaning, cleanHtml };
};

export default useCleaner;
