import { getSendEffectConfig } from '../../config/industry';

// Individual effect functions
const createLeafFlutterEffect = (element: HTMLElement, colors: string[]) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create 35 dramatic leaf particles with staggered timing
    for (let i = 0; i < 35; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            document.body.appendChild(particle);
            
            // DRAMATICALLY LARGER PARTICLES (3x bigger with variation)
            const width = Math.random() * 20 + 15; // 15-35px (was 5-13px)
            const height = Math.random() * 15 + 12; // 12-27px (was 5-10px)
            
            particle.style.position = 'absolute';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.width = `${width}px`;
            particle.style.height = `${height}px`;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = '20% 80% 30% 70%'; // More organic leaf shape
            particle.style.opacity = '0.95';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            // ADD DRAMATIC SHADOW EFFECT
            particle.style.boxShadow = `
                0 2px 8px rgba(0, 0, 0, 0.3),
                0 1px 3px rgba(0, 0, 0, 0.4),
                inset 1px 1px 2px rgba(255, 255, 255, 0.3)
            `;
            
            // DRAMATIC TRAVEL DISTANCE (3x farther)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150 + 80; // 80-230px (was 20-70px)
            const finalX = Math.cos(angle) * distance;
            const finalY = Math.sin(angle) * distance;
            
            // MULTIPLE SPINNING ROTATIONS
            const spinRotations = (Math.random() - 0.5) * 720; // Full spins up to 2 rotations
            const flutterAngle = (Math.random() - 0.5) * 45;
            
            // Enhanced transition with cubic-bezier for more natural feel
            particle.style.transition = `
                transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                opacity 1.2s ease-out
            `;

            // Animate with dramatic spinning and scaling
            requestAnimationFrame(() => {
                particle.style.transform = `
                    translateX(${finalX}px)
                    translateY(${finalY}px)
                    rotate(${spinRotations + flutterAngle}deg)
                    scale(0.1)
                `;
                particle.style.opacity = '0';
            });

            setTimeout(() => {
                particle.remove();
            }, 1200);
        }, i * 15); // Stagger each particle by 15ms for wave effect
    }
};

const createGentlePulseEffect = (element: HTMLElement, colors: string[]) => {
    const pulse = document.createElement('div');
    document.body.appendChild(pulse);
    const rect = element.getBoundingClientRect();

    pulse.style.position = 'absolute';
    pulse.style.left = `${rect.left}px`;
    pulse.style.top = `${rect.top}px`;
    pulse.style.width = `${rect.width}px`;
    pulse.style.height = `${rect.height}px`;
    pulse.style.borderRadius = element.style.borderRadius || '0.75rem';
    pulse.style.backgroundColor = colors[1] || '#3b82f6';
    pulse.style.opacity = '0.7';
    pulse.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
    pulse.style.pointerEvents = 'none';
    pulse.style.zIndex = '9998';

    requestAnimationFrame(() => {
        pulse.style.transform = 'scale(1.5)';
        pulse.style.opacity = '0';
    });

    setTimeout(() => {
        pulse.remove();
    }, 500);
};

const createSparkBurstEffect = (element: HTMLElement, colors: string[]) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create 45 explosive spark particles with dramatic burst pattern
    for (let i = 0; i < 45; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            document.body.appendChild(particle);
            
            // DRAMATICALLY LARGER SPARKS with varied sizes
            const isLargeSpark = Math.random() < 0.3; // 30% chance for large sparks
            const width = isLargeSpark ? Math.random() * 6 + 4 : Math.random() * 4 + 2; // 2-6px or 4-10px
            const height = isLargeSpark ? Math.random() * 25 + 15 : Math.random() * 18 + 10; // 10-28px or 15-40px
            
            particle.style.position = 'absolute';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.width = `${width}px`;
            particle.style.height = `${height}px`;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = isLargeSpark ? '2px' : '1px';
            particle.style.opacity = '1';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            // ADD DRAMATIC GLOW EFFECTS
            const glowColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.boxShadow = `
                0 0 ${isLargeSpark ? '12px' : '8px'} ${glowColor}40,
                0 0 ${isLargeSpark ? '8px' : '5px'} ${glowColor}60,
                0 0 ${isLargeSpark ? '4px' : '2px'} ${glowColor}80,
                0 0 ${isLargeSpark ? '2px' : '1px'} ${glowColor}
            `;
            
            // EXPLOSIVE BURST PATTERN - wider spread in initial burst
            const angle = (i / 45) * 360 + (Math.random() - 0.5) * 40; // Even distribution with variation
            const distance = Math.random() * 200 + 100; // 100-300px (was 30-70px)
            const finalX = Math.cos(angle * Math.PI / 180) * distance;
            const finalY = Math.sin(angle * Math.PI / 180) * distance;
            
            // TRAILS EFFECT - create motion blur
            particle.style.filter = `blur(0.5px)`;
            particle.style.transition = `
                transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                opacity 0.8s ease-out,
                filter 0.8s ease-out
            `;

            // Initial position with slight randomness
            particle.style.transform = `
                translateX(${(Math.random() - 0.5) * 10}px)
                translateY(${(Math.random() - 0.5) * 10}px)
                rotate(${angle}deg)
                scale(1.2)
            `;

            // Animate with explosive burst and trail fade
            requestAnimationFrame(() => {
                particle.style.transform = `
                    translateX(${finalX}px)
                    translateY(${finalY}px)
                    rotate(${angle}deg)
                    scale(0)
                `;
                particle.style.opacity = '0';
                particle.style.filter = `blur(2px)`;
            });

            setTimeout(() => {
                particle.remove();
            }, 800);
        }, i * 8); // Faster stagger for explosive feel (8ms vs 15ms)
    }
}

const createGearSpinEffect = (element: HTMLElement, colors: string[]) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create 30 spinning gear-like particles
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            document.body.appendChild(particle);
            
            // Gear-like squares with varied sizes
            const size = Math.random() * 12 + 8; // 8-20px squares
            
            particle.style.position = 'absolute';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = '2px';
            particle.style.opacity = '0.9';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            // Metallic gear effect
            particle.style.boxShadow = `
                0 2px 4px rgba(0, 0, 0, 0.4),
                inset 1px 1px 2px rgba(255, 255, 255, 0.3),
                inset -1px -1px 2px rgba(0, 0, 0, 0.2)
            `;
            
            // Mechanical spinning pattern
            const angle = (i / 30) * 360;
            const distance = Math.random() * 120 + 60; // 60-180px
            const finalX = Math.cos(angle * Math.PI / 180) * distance;
            const finalY = Math.sin(angle * Math.PI / 180) * distance;
            
            // Gear spinning rotations
            const spinRotations = 720 + (Math.random() * 360); // 2+ full rotations
            
            particle.style.transition = `
                transform 1.0s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                opacity 1.0s ease-out
            `;

            // Animate with mechanical precision
            requestAnimationFrame(() => {
                particle.style.transform = `
                    translateX(${finalX}px)
                    translateY(${finalY}px)
                    rotate(${spinRotations}deg)
                    scale(0.2)
                `;
                particle.style.opacity = '0';
            });

            setTimeout(() => {
                particle.remove();
            }, 1000);
        }, i * 12); // Mechanical timing
    }
}

const createWaterRippleEffect = (element: HTMLElement, colors: string[]) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create 25 expanding ripple circles
    for (let i = 0; i < 25; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            document.body.appendChild(particle);
            
            // Circular ripple particles
            const size = Math.random() * 8 + 4; // 4-12px initial size
            
            particle.style.position = 'absolute';
            particle.style.left = `${centerX - size/2}px`;
            particle.style.top = `${centerY - size/2}px`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.borderRadius = '50%';
            particle.style.border = `2px solid ${colors[Math.floor(Math.random() * colors.length)]}`;
            particle.style.backgroundColor = 'transparent';
            particle.style.opacity = '0.8';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            // Water ripple positioning - random spread from center
            const angle = Math.random() * Math.PI * 2;
            const maxDistance = Math.random() * 100 + 50; // 50-150px
            const finalX = Math.cos(angle) * maxDistance;
            const finalY = Math.sin(angle) * maxDistance;
            
            // Ripple expansion animation
            particle.style.transition = `
                transform 1.1s ease-out,
                opacity 1.1s ease-out
            `;

            // Animate expanding ripples
            requestAnimationFrame(() => {
                particle.style.transform = `
                    translateX(${finalX}px)
                    translateY(${finalY}px)
                    scale(6)
                `;
                particle.style.opacity = '0';
            });

            setTimeout(() => {
                particle.remove();
            }, 1100);
        }, i * 20); // Wave-like timing
    }
}


// Main trigger function
export const triggerSendEffect = (buttonElement: HTMLElement | null) => {
  if (!buttonElement) return;

  const config = getSendEffectConfig();

  switch (config.effect) {
    case 'leaf_flutter':
      createLeafFlutterEffect(buttonElement, config.colors);
      break;
    case 'spark_burst':
      createSparkBurstEffect(buttonElement, config.colors);
      break;
    case 'gear_spin':
      createGearSpinEffect(buttonElement, config.colors);
      break;
    case 'water_ripple':
      createWaterRippleEffect(buttonElement, config.colors);
      break;
    case 'gentle_pulse':
      createGentlePulseEffect(buttonElement, config.colors);
      break;
    default:
      // Fallback to gentle pulse for unknown effects
      createGentlePulseEffect(buttonElement, config.colors);
      break;
  }
};
