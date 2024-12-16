"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function SplitText({ 
    children, 
    className = "", 
    delay = 0,
    duration = 0.8,
    stagger = 0.03,
    x = -20,
    ease = "power2.out",
    as: Component = 'div'
}) {
    const containerRef = useRef(null);
    const spansRef = useRef([]);

    useEffect(() => {
        // Ensure we have a valid ref and GSAP is available
        if (!containerRef.current || typeof window === 'undefined') return;

        // Function to process text nodes
        const processNode = (parentNode) => {
            const spans = [];
            const childNodes = Array.from(parentNode.childNodes);
            childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    // Get the immediate parent
                    const parentSpan = node.parentElement;
                    console.log(parentSpan);
                    // Split text and create spans with parent's style
                    node.textContent.split('').forEach(char => {
                        const span = document.createElement('span');
                        span.textContent = char === ' ' ? '\u00A0' : char;
                        
                        // Base animation styles
                        span.style.display = 'inline-block';
                        span.style.opacity = '0';
                        span.style.transform = `translateX(${x}px)`;
                        
                        if (parentSpan) {
                            // Copy inline styles directly from the style attribute
                            const inlineStyles = parentSpan.getAttribute('style');
                            if (inlineStyles) {
                                // Parse and apply each style
                                const styleObj = {};
                                inlineStyles.split(';').forEach(style => {
                                    const [property, value] = style.split(':').map(s => s.trim());
                                    if (property && value) {
                                        styleObj[property] = value;
                                    }
                                });
                                
                                // Apply parsed styles
                                Object.assign(span.style, styleObj);
                            }
                            
                            // Re-apply animation styles to ensure they're not overwritten
                            span.style.display = 'inline-block';
                            span.style.opacity = '0';
                            span.style.transform = `translateX(${x}px)`;
                            
                            // Copy classes
                            if (parentSpan.className) {
                                span.className = parentSpan.className;
                            }
                        }
                        
                        spans.push(span);
                    });
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // Process child nodes recursively
                    spans.push(...processNode(node));
                }
            });
            
            return spans;
        };

        // Process all nodes and collect spans
        const allSpans = processNode(containerRef.current);
        
        // Clear container and append spans
        containerRef.current.innerHTML = '';
        allSpans.forEach(span => {
            containerRef.current.appendChild(span);
        });

        // Store spans reference
        spansRef.current = allSpans;

        // Create animation timeline
        const tl = gsap.timeline({
            delay: delay,
            defaults: {
                duration: duration,
                ease: ease
            }
        });

        // Animate characters
        tl.to(allSpans, {
            opacity: 1,
            x: 0,
            stagger: stagger,
            clearProps: "transform,opacity"
        });

        // Cleanup function
        return () => {
            if (tl) tl.kill();
            if (spansRef.current.length) {
                gsap.set(spansRef.current, { clearProps: "all" });
            }
        };
    }, [children, delay, duration, stagger, x, ease]);

    return (
        <Component 
            ref={containerRef} 
            className={className}
        >
            {children}
        </Component>
    );
}
