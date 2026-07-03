You're right! Let me add the `additionalProps` / `customData` section for dynamic tool-specific data:

---

**frontend_tool_generation_prompt_v2.1.md**
```markdown
# Frontend Interactive Tool Generation Prompt v2.1

Use this prompt with Claude or Gemini to generate interactive educational React/TypeScript tools with heavy animations, multiple modes, agent-friendly configuration, and dynamic content via additionalProps.

---

## SYSTEM PROMPT

```
You are an expert React/TypeScript developer specializing in creating highly animated, interactive educational tools.

Your task is to generate a COMPLETE, PRODUCTION-READY, HEAVILY ANIMATED React component with the following requirements:

═══════════════════════════════════════════════════════════════════════════════
MANDATORY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

1. **Single File Component**: Everything must be in ONE .tsx file
2. **TypeScript**: Use proper TypeScript with interfaces for all props and data
3. **Pure CSS-in-JS**: Use ONLY inline styles and CSS-in-JS (NO Tailwind, NO external CSS)
4. **Self-Contained**: Include all types, interfaces, styles, and logic in the same file
5. **Heavy Animations**: Every interaction must have smooth, visually appealing animations using React state and CSS transitions/keyframes
6. **Dynamic Content**: Support additionalProps for agent-provided dynamic content
7. **External Libraries Allowed**: You MAY import any of the supported external libraries listed below. The iframe renderer will auto-detect imports and load the corresponding CDN bundles at runtime.

═══════════════════════════════════════════════════════════════════════════════
SUPPORTED EXTERNAL LIBRARIES
═══════════════════════════════════════════════════════════════════════════════

The iframe renderer automatically detects `import` statements and loads the corresponding library from CDN. You can use standard ES module import syntax — imports are stripped before transpilation but the libraries are loaded globally.

| Library | Import Example | Global Variable | Use Case |
|---------|---------------|-----------------|----------|
| **Three.js** | `import * as THREE from 'three'` | `THREE` | 3D graphics, WebGL scenes |
| **D3.js** | `import * as d3 from 'd3'` | `d3` | Data visualizations, SVG charts |
| **Chart.js** | `import Chart from 'chart.js'` | `Chart` | Canvas-based charts |
| **Matter.js** | `import Matter from 'matter-js'` | `Matter` | 2D physics simulations |
| **p5.js** | `import p5 from 'p5'` | `p5` | Creative coding, generative art |
| **Tone.js** | `import * as Tone from 'tone'` | `Tone` | Audio synthesis, music tools |
| **GSAP** | `import gsap from 'gsap'` | `gsap` | Advanced animation timelines |
| **anime.js** | `import anime from 'animejs'` | `anime` | Lightweight animations |
| **KaTeX** | `import katex from 'katex'` | `katex` | Math equation rendering (CSS auto-loaded) |
| **Plotly.js** | `import Plotly from 'plotly.js'` | `Plotly` | Scientific/statistical charts |
| **math.js** | `import * as math from 'mathjs'` | `math` | Advanced math operations |
| **cannon-es** | `import * as CANNON from 'cannon-es'` | `CANNON` | 3D physics engine |

**How it works:**
- Write standard import statements at the top of your component (e.g., `import * as THREE from 'three'`)
- The renderer detects these imports, loads the UMD bundle from CDN, and creates global variable shims
- Your transpiled code accesses the library through these globals seamlessly
- React and ReactDOM are always available — no need to import them

**Example — Three.js Component:**
```tsx
import * as THREE from 'three';
import React, { useRef, useEffect } from 'react';

const My3DScene: React.FC<{ props?: any }> = ({ props = {} }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    mountRef.current?.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    camera.position.z = 3;

    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: 800, height: 600, borderRadius: 16, overflow: 'hidden' }} />;
};

export default My3DScene;
```

═══════════════════════════════════════════════════════════════════════════════
PROPS INTERFACE - MUST FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════════════

interface ToolNameProps {
    props?: {
        // ─────────────────────────────────────────────────────────────────
        // DIMENSIONS
        // ─────────────────────────────────────────────────────────────────
        width?: number;                    // Default: 800
        height?: number;                   // Default: 600
        
        // ─────────────────────────────────────────────────────────────────
        // DATA CONFIGURATION
        // ─────────────────────────────────────────────────────────────────
        data?: BaseDataInterface;
        steps?: StepDataInterface[];
        
        // ─────────────────────────────────────────────────────────────────
        // MODE CONFIGURATION
        // ─────────────────────────────────────────────────────────────────
        initialMode?: ModeType;            // Starting mode
        showModeSelector?: boolean;        // Show/hide mode tabs (default: true)
        enabledModes?: ModeType[];         // Which modes to enable
        
        // ─────────────────────────────────────────────────────────────────
        // NAVIGATION CONFIGURATION
        // ─────────────────────────────────────────────────────────────────
        showNavigation?: boolean;          // Show/hide prev/next buttons (default: true)
        showPlayPause?: boolean;           // Show/hide play/pause button (default: true)
        showStepIndicator?: boolean;       // Show/hide step counter (default: true)
        
        // ─────────────────────────────────────────────────────────────────
        // STEP FILTERING
        // ─────────────────────────────────────────────────────────────────
        initialStep?: number;              // Starting step ID
        filterSteps?: number[];            // Only show these step IDs
        
        // ─────────────────────────────────────────────────────────────────
        // ANIMATION CONFIGURATION
        // ─────────────────────────────────────────────────────────────────
        animationSpeed?: number;           // Animation speed multiplier (default: 1)
        autoPlayDuration?: number;         // Auto-advance delay in ms (default: 8000)
        
        // ─────────────────────────────────────────────────────────────────
        // THEME
        // ─────────────────────────────────────────────────────────────────
        themeColor?: string;               // Primary color (default: "#3b82f6")
        darkMode?: boolean;                // Dark mode toggle (default: false)
        
        // ─────────────────────────────────────────────────────────────────
        // ADDITIONAL PROPS - TOOL-SPECIFIC DYNAMIC CONTENT
        // ─────────────────────────────────────────────────────────────────
        additionalProps?: {
            // Tool-specific dynamic data passed by agent
            // Examples:
            // - Number line: { numbers: [1, 5, 10], highlightNumber: 5 }
            // - Fraction tool: { numerator: 3, denominator: 4 }
            // - Graph tool: { dataPoints: [...], labels: [...] }
            // - Geometry: { shapes: [...], angles: [...] }
            [key: string]: any;
        };
    };
    
    // ─────────────────────────────────────────────────────────────────
    // EXTERNAL CONTROLS (for parent component integration)
    // ─────────────────────────────────────────────────────────────────
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────
// ADDITIONAL PROPS INTERFACE - DEFINE FOR EACH TOOL
// ─────────────────────────────────────────────────────────────────

// Example for Number Line Tool:
interface NumberLineAdditionalProps {
    numbers?: number[];                    // Numbers to display on line
    minValue?: number;                     // Minimum value on number line
    maxValue?: number;                     // Maximum value on number line
    step?: number;                         // Step/interval between numbers
    highlightNumbers?: number[];           // Numbers to highlight
    showOperations?: boolean;              // Show addition/subtraction jumps
    operations?: {
        type: 'add' | 'subtract';
        from: number;
        value: number;
    }[];
    customMarkers?: {
        position: number;
        label: string;
        color: string;
    }[];
}

// Example for Fraction Tool:
interface FractionAdditionalProps {
    fractions?: {
        numerator: number;
        denominator: number;
        label?: string;
    }[];
    showComparison?: boolean;
    operation?: 'add' | 'subtract' | 'multiply' | 'divide' | 'compare';
    visualStyle?: 'pizza' | 'bar' | 'circle' | 'rectangle';
}

// Example for Graph/Chart Tool:
interface GraphAdditionalProps {
    chartType?: 'bar' | 'line' | 'pie' | 'double_bar';
    data?: {
        labels: string[];
        values: number[];
        values2?: number[];                // For double bar/comparison
        colors?: string[];
    };
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showValues?: boolean;
    animated?: boolean;
}

// Example for Geometry Tool:
interface GeometryAdditionalProps {
    shapes?: {
        type: 'triangle' | 'rectangle' | 'circle' | 'polygon';
        dimensions: { [key: string]: number };
        color?: string;
        label?: string;
    }[];
    showAngles?: boolean;
    showMeasurements?: boolean;
    highlightedParts?: string[];
}

═══════════════════════════════════════════════════════════════════════════════
ANIMATION REQUIREMENTS - CRITICAL
═══════════════════════════════════════════════════════════════════════════════

Every component MUST include these animation patterns:

1. **Page/Step Transitions**
   - Fade + slide animations between steps
   - Smooth opacity and transform transitions
   - Duration: 400-600ms with easing

2. **Element Entry Animations**
   - Staggered animations for lists/grids
   - Scale + fade for appearing elements
   - Bounce effects for interactive items

3. **Hover Effects**
   - Scale transform (1.02-1.08)
   - Shadow elevation changes
   - Color transitions
   - Cursor feedback

4. **Button Animations**
   - Press effect (scale down to 0.95)
   - Ripple effect on click
   - Loading states with spinners
   - Disabled state animations

5. **Canvas/SVG Animations**
   - Use requestAnimationFrame for smooth 60fps
   - Easing functions for natural motion
   - Progress-based drawing animations

6. **Micro-interactions**
   - Toggle switches with slide animation
   - Checkbox with checkmark draw animation
   - Input focus with border/glow animation
   - Tooltip fade-in with slight translate

7. **Data-Driven Animations** (for additionalProps)
   - Animate when additionalProps change
   - Smooth transitions between data states
   - Number counting animations
   - Graph bar/line growing animations

═══════════════════════════════════════════════════════════════════════════════
HANDLING ADDITIONAL PROPS IN COMPONENT
═══════════════════════════════════════════════════════════════════════════════

const ToolName: React.FC<ToolNameProps> = ({ props = {}, ...rest }) => {
    // Extract additionalProps with defaults
    const additionalProps = props.additionalProps || {};
    
    // Tool-specific defaults
    const {
        numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        minValue = 0,
        maxValue = 10,
        highlightNumbers = [],
        operations = [],
        // ... other tool-specific props
    } = additionalProps as NumberLineAdditionalProps;
    
    // Use in rendering
    const renderNumberLine = useCallback(() => {
        return numbers.map((num, index) => (
            <div
                key={num}
                style={{
                    ...styles.numberMarker,
                    backgroundColor: highlightNumbers.includes(num) 
                        ? config.themeColor 
                        : '#e2e8f0',
                    animation: `popIn 0.5s ease-out ${index * 0.1}s both`,
                }}
            >
                {num}
            </div>
        ));
    }, [numbers, highlightNumbers, config.themeColor]);
    
    // Animate when additionalProps change
    useEffect(() => {
        if (additionalProps.numbers) {
            setIsAnimating(true);
            // Trigger re-animation
            setTimeout(() => setIsAnimating(false), 1000);
        }
    }, [additionalProps]);
    
    // ... rest of component
};

═══════════════════════════════════════════════════════════════════════════════
STYLING APPROACH - CSS-IN-JS ONLY
═══════════════════════════════════════════════════════════════════════════════

Use this pattern for all styles:

// Style objects
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    button: {
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        transition: 'all 0.3s ease',
        transform: 'scale(1)',
    },
    buttonHover: {
        transform: 'scale(1.05)',
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
    },
    buttonActive: {
        transform: 'scale(0.95)',
    },
};

// Keyframe animations via style tag
const keyframes = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(50px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    
    @keyframes ripple {
        0% { transform: scale(0); opacity: 0.5; }
        100% { transform: scale(4); opacity: 0; }
    }
    
    @keyframes drawLine {
        from { stroke-dashoffset: 1000; }
        to { stroke-dashoffset: 0; }
    }
    
    @keyframes popIn {
        0% { transform: scale(0); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes countUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes highlight {
        0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0.3); }
    }
    
    @keyframes jump {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
    }
`;

// Inject keyframes in component
useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'tool-keyframes';
    styleSheet.textContent = keyframes;
    document.head.appendChild(styleSheet);
    return () => {
        const existing = document.getElementById('tool-keyframes');
        if (existing) document.head.removeChild(existing);
    };
}, []);

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT - MUST GENERATE ALL THREE FILES
═══════════════════════════════════════════════════════════════════════════════

Your response MUST include three clearly separated sections:

1. **COMPONENT CODE** - The complete TSX file
2. **TOOL SCHEMA JSON** - Configuration, parameters, and additionalProps schema
3. **AGENT README** - Instructions with additionalProps examples

Format each section exactly as shown below:

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: {tool_name}.tsx
// ═══════════════════════════════════════════════════════════════════════════

[Complete React component code here]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// TOOL SCHEMA JSON START
// File: {tool_name}_schema.json
// ═══════════════════════════════════════════════════════════════════════════

{
    "toolName": "tool_name_here",
    "version": "1.0.0",
    "description": "Tool description",
    "parameters": { ... },
    "additionalProps": { ... },  // MUST INCLUDE
    "modes": { ... },
    "steps": { ... }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL SCHEMA JSON END
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// AGENT README START
// File: {tool_name}_agent_readme.md
// ═══════════════════════════════════════════════════════════════════════════

# Tool Name - Agent Instructions

## Overview
...

## Quick Reference Table
...

## additionalProps Reference  // MUST INCLUDE
...

## Tool Call Examples (with additionalProps)  // MUST INCLUDE
...

## Parameter Details
...

// ═══════════════════════════════════════════════════════════════════════════
// AGENT README END
// ═══════════════════════════════════════════════════════════════════════════

```

---

## USER PROMPT TEMPLATE

```
Create an interactive educational tool for [TOPIC].

Tool Name: [tool_name_in_snake_case]

Requirements:
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

The tool should teach:
1. [Learning objective 1]
2. [Learning objective 2]
3. [Learning objective 3]

Include real-world examples like:
- [Example context 1]
- [Example context 2]
- [Example context 3]

Modes needed:
- Learn: [what to cover]
- Practice: [what questions]
- Real World: [what examples]
- Hands On: [what activities]

Dynamic content (additionalProps) needed:
- [What data agent should be able to pass]
- [What customizations should be possible]
- [What values should be configurable]
```

---

## COMPLETE EXAMPLE OUTPUT - NUMBER LINE TOOL

Below is a complete example showing how additionalProps enables dynamic content:

### COMPONENT CODE

```tsx
// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: number_line_tool.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Check, X, Plus, Minus } from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
    currentStep: number;
    totalSteps: number;
    isPaused: boolean;
    currentMode: ModeType;
}

interface StepDataInterface {
    id: number;
    title: string;
    description: string;
    type: 'intro' | 'explanation' | 'practice' | 'real_world' | 'hands_on';
    mode: ModeType;
    data?: any;
}

interface BaseDataInterface {
    themeColor?: string;
    autoPlayDuration?: number;
}

// ADDITIONAL PROPS - TOOL SPECIFIC
interface NumberLineAdditionalProps {
    // Number range
    minValue?: number;
    maxValue?: number;
    step?: number;
    
    // Display options
    numbers?: number[];
    highlightNumbers?: number[];
    activeNumber?: number;
    
    // Operations to show
    showOperations?: boolean;
    operations?: {
        type: 'add' | 'subtract';
        from: number;
        value: number;
        color?: string;
        label?: string;
    }[];
    
    // Custom markers
    customMarkers?: {
        position: number;
        label: string;
        color: string;
        icon?: 'star' | 'flag' | 'dot' | 'arrow';
    }[];
    
    // Appearance
    lineColor?: string;
    markerSize?: number;
    showLabels?: boolean;
    showTicks?: boolean;
    
    // Interaction
    interactive?: boolean;
    onNumberClick?: (num: number) => void;
}

interface NumberLineToolProps {
    props?: {
        width?: number;
        height?: number;
        data?: BaseDataInterface;
        steps?: StepDataInterface[];
        initialMode?: ModeType;
        showModeSelector?: boolean;
        enabledModes?: ModeType[];
        showNavigation?: boolean;
        showPlayPause?: boolean;
        showStepIndicator?: boolean;
        initialStep?: number;
        filterSteps?: number[];
        animationSpeed?: number;
        autoPlayDuration?: number;
        themeColor?: string;
        darkMode?: boolean;
        additionalProps?: NumberLineAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DEFAULT STEPS ====================

const DEFAULT_STEPS: StepDataInterface[] = [
    // LEARN MODE
    {
        id: 1,
        title: "What is a Number Line?",
        description: "A number line is a straight line with numbers placed at equal intervals. It helps us visualize numbers and their relationships!",
        type: 'intro',
        mode: 'learn',
    },
    {
        id: 2,
        title: "Numbers in Order",
        description: "Numbers increase as we move right and decrease as we move left. Each position represents a specific value.",
        type: 'explanation',
        mode: 'learn',
    },
    {
        id: 3,
        title: "Addition on Number Line",
        description: "To add numbers, start at the first number and jump right by the second number. Watch the animated jumps!",
        type: 'explanation',
        mode: 'learn',
        data: { showAddition: true }
    },
    {
        id: 4,
        title: "Subtraction on Number Line",
        description: "To subtract, start at the first number and jump left. Each jump represents subtracting 1.",
        type: 'explanation',
        mode: 'learn',
        data: { showSubtraction: true }
    },
    {
        id: 5,
        title: "Comparing Numbers",
        description: "Numbers on the right are greater than numbers on the left. We can easily compare by looking at positions!",
        type: 'explanation',
        mode: 'learn',
    },
    
    // PRACTICE MODE
    {
        id: 10,
        title: "Find the Number",
        description: "Click on the correct position on the number line!",
        type: 'practice',
        mode: 'practice',
        data: {
            question: "Where is 7 on the number line?",
            answer: 7
        }
    },
    {
        id: 11,
        title: "Addition Practice",
        description: "Solve: 3 + 4 = ? Use the number line to help!",
        type: 'practice',
        mode: 'practice',
        data: {
            question: "3 + 4 = ?",
            operation: { type: 'add', from: 3, value: 4 },
            answer: 7
        }
    },
    {
        id: 12,
        title: "Subtraction Practice",
        description: "Solve: 8 - 3 = ? Watch the jumps go left!",
        type: 'practice',
        mode: 'practice',
        data: {
            question: "8 - 3 = ?",
            operation: { type: 'subtract', from: 8, value: 3 },
            answer: 5
        }
    },
    
    // REAL WORLD MODE
    {
        id: 20,
        title: "Temperature Scale",
        description: "Thermometers use a number line! Temperatures can be positive (hot) or negative (cold).",
        type: 'real_world',
        mode: 'real_world',
        data: { context: 'temperature' }
    },
    {
        id: 21,
        title: "Measuring Distance",
        description: "Rulers are number lines! We measure length by counting units from zero.",
        type: 'real_world',
        mode: 'real_world',
        data: { context: 'ruler' }
    },
    {
        id: 22,
        title: "Timeline of Events",
        description: "History uses number lines called timelines to show when events happened!",
        type: 'real_world',
        mode: 'real_world',
        data: { context: 'timeline' }
    },
    
    // HANDS ON MODE
    {
        id: 30,
        title: "Build Your Number Line",
        description: "Create your own number line! Set the range and add markers.",
        type: 'hands_on',
        mode: 'hands_on',
        data: { editable: true }
    },
    {
        id: 31,
        title: "Create Operations",
        description: "Add your own addition and subtraction operations to visualize!",
        type: 'hands_on',
        mode: 'hands_on',
        data: { editable: true, showOperationBuilder: true }
    },
];

// ==================== ANIMATION HELPERS ====================

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutBounce = (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// ==================== MAIN COMPONENT ====================

const NumberLineTool: React.FC<NumberLineToolProps> = ({ 
    props = {}, 
    setStepDetails, 
    stopAutoNext, 
    setStopAutoNext 
}) => {
    // ─────────────────────────────────────────────────────────────────
    // CONFIGURATION WITH DEFAULTS
    // ─────────────────────────────────────────────────────────────────
    
    const config = useMemo(() => ({
        width: props.width ?? 800,
        height: props.height ?? 600,
        initialMode: props.initialMode ?? 'learn',
        showModeSelector: props.showModeSelector ?? true,
        enabledModes: props.enabledModes ?? ['learn', 'practice', 'real_world', 'hands_on'],
        showNavigation: props.showNavigation ?? true,
        showPlayPause: props.showPlayPause ?? true,
        showStepIndicator: props.showStepIndicator ?? true,
        initialStep: props.initialStep ?? 1,
        filterSteps: props.filterSteps ?? null,
        animationSpeed: props.animationSpeed ?? 1,
        autoPlayDuration: props.autoPlayDuration ?? props.data?.autoPlayDuration ?? 8000,
        themeColor: props.themeColor ?? props.data?.themeColor ?? '#3b82f6',
        darkMode: props.darkMode ?? false,
    }), [props]);
    
    // ─────────────────────────────────────────────────────────────────
    // ADDITIONAL PROPS - TOOL SPECIFIC CONTENT
    // ─────────────────────────────────────────────────────────────────
    
    const additionalProps = props.additionalProps || {};
    
    const numberLineConfig = useMemo(() => ({
        minValue: additionalProps.minValue ?? 0,
        maxValue: additionalProps.maxValue ?? 10,
        step: additionalProps.step ?? 1,
        numbers: additionalProps.numbers ?? null, // Will generate from min/max if null
        highlightNumbers: additionalProps.highlightNumbers ?? [],
        activeNumber: additionalProps.activeNumber ?? null,
        showOperations: additionalProps.showOperations ?? false,
        operations: additionalProps.operations ?? [],
        customMarkers: additionalProps.customMarkers ?? [],
        lineColor: additionalProps.lineColor ?? '#64748b',
        markerSize: additionalProps.markerSize ?? 40,
        showLabels: additionalProps.showLabels ?? true,
        showTicks: additionalProps.showTicks ?? true,
        interactive: additionalProps.interactive ?? false,
    }), [additionalProps]);
    
    // Generate numbers array if not provided
    const numbers = useMemo(() => {
        if (numberLineConfig.numbers) return numberLineConfig.numbers;
        const nums = [];
        for (let i = numberLineConfig.minValue; i <= numberLineConfig.maxValue; i += numberLineConfig.step) {
            nums.push(i);
        }
        return nums;
    }, [numberLineConfig]);
    
    // ─────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────
    
    const allSteps = props.steps || DEFAULT_STEPS;
    
    const availableSteps = useMemo(() => {
        if (config.filterSteps && config.filterSteps.length > 0) {
            return allSteps.filter(s => config.filterSteps!.includes(s.id));
        }
        return allSteps;
    }, [allSteps, config.filterSteps]);
    
    const [selectedMode, setSelectedMode] = useState<ModeType>(config.initialMode);
    const [currentStepIndex, setCurrentStepIndex] = useState(() => {
        const steps = availableSteps.filter(s => s.mode === config.initialMode);
        if (config.initialStep) {
            const idx = steps.findIndex(s => s.id === config.initialStep);
            return idx >= 0 ? idx : 0;
        }
        return 0;
    });
    const [isPlaying, setIsPlaying] = useState(!stopAutoNext);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [buttonStates, setButtonStates] = useState<{[key: string]: 'idle' | 'hover' | 'active'}>({});
    const [animationPhase, setAnimationPhase] = useState(0);
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [operationStep, setOperationStep] = useState(0);
    
    // Animation states
    const [contentOpacity, setContentOpacity] = useState(1);
    const [contentTransform, setContentTransform] = useState('translateY(0)');
    
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    
    // Filter steps by mode
    const filteredSteps = useMemo(() => {
        return availableSteps.filter(step => step.mode === selectedMode);
    }, [availableSteps, selectedMode]);
    
    const currentStep = filteredSteps[currentStepIndex] || filteredSteps[0];
    
    // ─────────────────────────────────────────────────────────────────
    // INJECT KEYFRAMES
    // ─────────────────────────────────────────────────────────────────
    
    useEffect(() => {
        const keyframes = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOutDown {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-30px); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-15px); }
            }
            @keyframes popIn {
                0% { transform: scale(0); opacity: 0; }
                70% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }
            @keyframes jump {
                0% { transform: translateY(0) scale(1); }
                25% { transform: translateY(-30px) scale(1.1); }
                50% { transform: translateY(-40px) scale(1.15); }
                75% { transform: translateY(-30px) scale(1.1); }
                100% { transform: translateY(0) scale(1); }
            }
            @keyframes slideRight {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 5px ${config.themeColor}40; }
                50% { box-shadow: 0 0 25px ${config.themeColor}80; }
            }
            @keyframes drawArc {
                from { stroke-dashoffset: 200; }
                to { stroke-dashoffset: 0; }
            }
            @keyframes highlight {
                0% { background-color: ${config.themeColor}; transform: scale(1.3); }
                100% { background-color: ${config.themeColor}40; transform: scale(1); }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'number-line-keyframes';
        styleSheet.textContent = keyframes;
        document.head.appendChild(styleSheet);
        
        return () => {
            const existing = document.getElementById('number-line-keyframes');
            if (existing) document.head.removeChild(existing);
        };
    }, [config.themeColor]);
    
    // ─────────────────────────────────────────────────────────────────
    // CANVAS DRAWING
    // ─────────────────────────────────────────────────────────────────
    
    const drawNumberLine = useCallback((ctx: CanvasRenderingContext2D, progress: number) => {
        const width = config.width - 64;
        const height = config.height - 350;
        const padding = 60;
        const lineY = height / 2;
        
        // Clear
        ctx.clearRect(0, 0, width, height);
        
        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#f0f9ff');
        bgGradient.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Draw main line with animation
        const lineWidth = (width - padding * 2) * Math.min(progress * 2, 1);
        ctx.strokeStyle = numberLineConfig.lineColor;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(padding, lineY);
        ctx.lineTo(padding + lineWidth, lineY);
        ctx.stroke();
        
        // Draw arrows
        if (progress > 0.5) {
            const arrowProgress = (progress - 0.5) * 2;
            ctx.globalAlpha = arrowProgress;
            
            // Left arrow
            ctx.beginPath();
            ctx.moveTo(padding - 10, lineY);
            ctx.lineTo(padding + 5, lineY - 10);
            ctx.lineTo(padding + 5, lineY + 10);
            ctx.closePath();
            ctx.fillStyle = numberLineConfig.lineColor;
            ctx.fill();
            
            // Right arrow
            ctx.beginPath();
            ctx.moveTo(width - padding + 10, lineY);
            ctx.lineTo(width - padding - 5, lineY - 10);
            ctx.lineTo(width - padding - 5, lineY + 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1;
        }
        
        // Draw number markers
        const numberSpacing = (width - padding * 2) / (numbers.length - 1);
        
        numbers.forEach((num, index) => {
            const x = padding + index * numberSpacing;
            const delay = index * 0.05;
            const itemProgress = Math.max(0, Math.min((progress - 0.3 - delay) * 3, 1));
            
            if (itemProgress > 0) {
                const scale = easeOutElastic(itemProgress);
                const isHighlighted = numberLineConfig.highlightNumbers.includes(num);
                const isActive = numberLineConfig.activeNumber === num;
                
                // Tick mark
                if (numberLineConfig.showTicks) {
                    ctx.strokeStyle = isHighlighted ? config.themeColor : '#94a3b8';
                    ctx.lineWidth = isHighlighted ? 3 : 2;
                    ctx.beginPath();
                    ctx.moveTo(x, lineY - 10 * scale);
                    ctx.lineTo(x, lineY + 10 * scale);
                    ctx.stroke();
                }
                
                // Number circle
                const radius = (numberLineConfig.markerSize / 2) * scale;
                
                // Glow effect for highlighted
                if (isHighlighted || isActive) {
                    ctx.shadowColor = config.themeColor;
                    ctx.shadowBlur = 15;
                }
                
                ctx.beginPath();
                ctx.arc(x, lineY + 45, radius, 0, Math.PI * 2);
                ctx.fillStyle = isActive 
                    ? config.themeColor 
                    : isHighlighted 
                        ? `${config.themeColor}40`
                        : 'white';
                ctx.fill();
                ctx.strokeStyle = isHighlighted || isActive ? config.themeColor : '#cbd5e1';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                ctx.shadowBlur = 0;
                
                // Number label
                if (numberLineConfig.showLabels) {
                    ctx.font = `bold ${16 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
                    ctx.fillStyle = isActive ? 'white' : '#1e293b';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(num.toString(), x, lineY + 45);
                }
            }
        });
        
        // Draw operations (jumping arcs)
        if (numberLineConfig.showOperations && numberLineConfig.operations.length > 0 && progress > 0.8) {
            const opProgress = (progress - 0.8) * 5;
            
            numberLineConfig.operations.forEach((op, opIndex) => {
                const fromIndex = numbers.indexOf(op.from);
                const toValue = op.type === 'add' ? op.from + op.value : op.from - op.value;
                const toIndex = numbers.indexOf(toValue);
                
                if (fromIndex >= 0 && toIndex >= 0) {
                    const fromX = padding + fromIndex * numberSpacing;
                    const toX = padding + toIndex * numberSpacing;
                    const arcHeight = 50 + Math.abs(toIndex - fromIndex) * 10;
                    
                    // Draw arc
                    ctx.strokeStyle = op.color || (op.type === 'add' ? '#10b981' : '#ef4444');
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 5]);
                    
                    ctx.beginPath();
                    const midX = (fromX + toX) / 2;
                    ctx.moveTo(fromX, lineY - 10);
                    ctx.quadraticCurveTo(midX, lineY - arcHeight, toX, lineY - 10);
                    
                    // Animate dash offset
                    ctx.lineDashOffset = -opProgress * 20;
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Arrow head
                    const arrowDir = op.type === 'add' ? 1 : -1;
                    ctx.beginPath();
                    ctx.moveTo(toX, lineY - 10);
                    ctx.lineTo(toX - 8 * arrowDir, lineY - 20);
                    ctx.lineTo(toX - 8 * arrowDir, lineY);
                    ctx.closePath();
                    ctx.fillStyle = op.color || (op.type === 'add' ? '#10b981' : '#ef4444');
                    ctx.fill();
                    
                    // Operation label
                    ctx.font = 'bold 14px -apple-system, sans-serif';
                    ctx.fillStyle = op.color || (op.type === 'add' ? '#10b981' : '#ef4444');
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        op.label || `${op.type === 'add' ? '+' : '-'}${op.value}`,
                        midX,
                        lineY - arcHeight - 10
                    );
                }
            });
        }
        
        // Draw custom markers
        numberLineConfig.customMarkers.forEach((marker, index) => {
            const markerIndex = numbers.indexOf(marker.position);
            if (markerIndex >= 0 && progress > 0.6) {
                const x = padding + markerIndex * numberSpacing;
                const markerProgress = Math.min((progress - 0.6) * 2.5, 1);
                
                ctx.globalAlpha = markerProgress;
                
                // Marker flag
                ctx.fillStyle = marker.color;
                ctx.beginPath();
                ctx.moveTo(x, lineY - 20);
                ctx.lineTo(x, lineY - 60);
                ctx.lineTo(x + 30, lineY - 50);
                ctx.lineTo(x, lineY - 40);
                ctx.closePath();
                ctx.fill();
                
                // Label
                ctx.font = 'bold 12px -apple-system, sans-serif';
                ctx.fillStyle = marker.color;
                ctx.textAlign = 'center';
                ctx.fillText(marker.label, x + 15, lineY - 70);
                
                ctx.globalAlpha = 1;
            }
        });
        
    }, [config, numbers, numberLineConfig]);
    
    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let startTime: number | null = null;
        const duration = 2000 / config.animationSpeed;
        
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            drawNumberLine(ctx, progress);
            
            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [currentStep, drawNumberLine, config.animationSpeed, additionalProps]);
    
    // ─────────────────────────────────────────────────────────────────
    // STEP DETAILS CALLBACK
    // ─────────────────────────────────────────────────────────────────
    
    useEffect(() => {
        if (setStepDetails) {
            setStepDetails({
                currentStep: currentStepIndex + 1,
                totalSteps: filteredSteps.length,
                isPaused: !isPlaying,
                currentMode: selectedMode
            });
        }
    }, [currentStepIndex, filteredSteps.length, isPlaying, selectedMode, setStepDetails]);
    
    // Auto-advance
    useEffect(() => {
        if (!isPlaying || stopAutoNext || config.autoPlayDuration === 0) return;
        
        const timer = setTimeout(() => {
            if (currentStepIndex < filteredSteps.length - 1) {
                animateStepChange('next');
            } else {
                setIsPlaying(false);
            }
        }, config.autoPlayDuration);
        
        return () => clearTimeout(timer);
    }, [isPlaying, currentStepIndex, stopAutoNext, filteredSteps.length, config.autoPlayDuration]);
    
    // ─────────────────────────────────────────────────────────────────
    // NAVIGATION
    // ─────────────────────────────────────────────────────────────────
    
    const animateStepChange = useCallback((direction: 'next' | 'prev') => {
        if (isTransitioning) return;
        
        setIsTransitioning(true);
        setContentOpacity(0);
        setContentTransform(direction === 'next' ? 'translateY(-30px)' : 'translateY(30px)');
        
        setTimeout(() => {
            setCurrentStepIndex(prev => direction === 'next' ? prev + 1 : prev - 1);
            setContentTransform(direction === 'next' ? 'translateY(30px)' : 'translateY(-30px)');
            
            setTimeout(() => {
                setContentOpacity(1);
                setContentTransform('translateY(0)');
                setIsTransitioning(false);
            }, 50);
        }, 300);
    }, [isTransitioning]);
    
    const nextStep = () => {
        if (currentStepIndex < filteredSteps.length - 1 && !isTransitioning) {
            animateStepChange('next');
        }
    };
    
    const prevStep = () => {
        if (currentStepIndex > 0 && !isTransitioning) {
            animateStepChange('prev');
        }
    };
    
    const changeMode = (mode: ModeType) => {
        if (mode === selectedMode) return;
        
        setIsTransitioning(true);
        setContentOpacity(0);
        
        setTimeout(() => {
            setSelectedMode(mode);
            setCurrentStepIndex(0);
            
            setTimeout(() => {
                setContentOpacity(1);
                setIsTransitioning(false);
            }, 50);
        }, 300);
    };
    
    // Button interactions
    const handleButtonInteraction = (id: string, state: 'idle' | 'hover' | 'active') => {
        setButtonStates(prev => ({ ...prev, [id]: state }));
    };
    
    const getButtonStyle = (id: string, baseStyle: React.CSSProperties): React.CSSProperties => {
        const state = buttonStates[id] || 'idle';
        return {
            ...baseStyle,
            transform: state === 'active' ? 'scale(0.95)' : state === 'hover' ? 'scale(1.05)' : 'scale(1)',
            boxShadow: state === 'hover' ? '0 10px 25px rgba(0,0,0,0.2)' : baseStyle.boxShadow,
        };
    };
    
    // ─────────────────────────────────────────────────────────────────
    // STYLES
    // ─────────────────────────────────────────────────────────────────
    
    const colors = {
        primary: config.themeColor,
        background: config.darkMode ? '#1a1a2e' : '#f8fafc',
        surface: config.darkMode ? '#16213e' : '#ffffff',
        text: config.darkMode ? '#e2e8f0' : '#1e293b',
        textSecondary: config.darkMode ? '#94a3b8' : '#64748b',
        border: config.darkMode ? '#334155' : '#e2e8f0',
    };
    
    const modeColors: { [key in ModeType]: { from: string; to: string } } = {
        learn: { from: '#3b82f6', to: '#06b6d4' },
        practice: { from: '#10b981', to: '#34d399' },
        real_world: { from: '#8b5cf6', to: '#ec4899' },
        hands_on: { from: '#f97316', to: '#ef4444' },
    };
    
    const styles: { [key: string]: React.CSSProperties } = {
        container: {
            width: '100%',
            maxWidth: `${config.width}px`,
            margin: '0 auto',
            background: colors.surface,
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        modeSelector: {
            display: config.showModeSelector ? 'flex' : 'none',
            gap: '12px',
            padding: '20px',
            background: colors.background,
            borderBottom: `1px solid ${colors.border}`,
            justifyContent: 'center',
            flexWrap: 'wrap' as const,
        },
        modeButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        header: {
            padding: '32px',
            color: 'white',
            position: 'relative' as const,
            overflow: 'hidden',
        },
        headerTitle: {
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '8px',
            animation: 'fadeInUp 0.6s ease-out',
        },
        stepIndicator: {
            display: config.showStepIndicator ? 'inline-flex' : 'none',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            backdropFilter: 'blur(10px)',
        },
        content: {
            padding: '32px',
            opacity: contentOpacity,
            transform: contentTransform,
            transition: `all ${300 / config.animationSpeed}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        },
        canvas: {
            width: '100%',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
        },
        description: {
            fontSize: '18px',
            lineHeight: 1.7,
            color: colors.text,
            padding: '24px',
            background: colors.background,
            borderRadius: '16px',
            borderLeft: `4px solid ${config.themeColor}`,
        },
        navigation: {
            display: config.showNavigation || config.showPlayPause ? 'flex' : 'none',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 32px',
            background: colors.background,
            borderTop: `1px solid ${colors.border}`,
        },
        navButton: {
            display: config.showNavigation ? 'flex' : 'none',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 28px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '15px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        playButton: {
            display: config.showPlayPause ? 'flex' : 'none',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '15px',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        progressBar: {
            height: '4px',
            background: colors.border,
            borderRadius: '2px',
            overflow: 'hidden',
            margin: '0 32px 24px',
        },
        progressFill: {
            height: '100%',
            background: `linear-gradient(90deg, ${modeColors[selectedMode].from}, ${modeColors[selectedMode].to})`,
            borderRadius: '2px',
            transition: 'width 0.5s ease-out',
            width: `${((currentStepIndex + 1) / filteredSteps.length) * 100}%`,
        },
    };
    
    // ─────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────
    
    return (
        <div style={styles.container}>
            {/* Mode Selector */}
            <div style={styles.modeSelector}>
                {config.enabledModes.map((mode) => {
                    const isSelected = selectedMode === mode;
                    const modeColor = modeColors[mode];
                    
                    return (
                        <button
                            key={mode}
                            onClick={() => changeMode(mode)}
                            onMouseEnter={() => handleButtonInteraction(`mode-${mode}`, 'hover')}
                            onMouseLeave={() => handleButtonInteraction(`mode-${mode}`, 'idle')}
                            onMouseDown={() => handleButtonInteraction(`mode-${mode}`, 'active')}
                            onMouseUp={() => handleButtonInteraction(`mode-${mode}`, 'hover')}
                            style={getButtonStyle(`mode-${mode}`, {
                                ...styles.modeButton,
                                background: isSelected 
                                    ? `linear-gradient(135deg, ${modeColor.from}, ${modeColor.to})`
                                    : colors.surface,
                                color: isSelected ? 'white' : colors.text,
                                boxShadow: isSelected ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
                            })}
                        >
                            {mode.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                    );
                })}
            </div>
            
            {/* Header */}
            <div style={{
                ...styles.header,
                background: `linear-gradient(135deg, ${modeColors[selectedMode].from}, ${modeColors[selectedMode].to})`,
            }}>
                <h2 style={styles.headerTitle}>{currentStep?.title}</h2>
                <span style={styles.stepIndicator}>
                    Step {currentStepIndex + 1} of {filteredSteps.length}
                </span>
            </div>
            
            {/* Progress Bar */}
            <div style={styles.progressBar}>
                <div style={styles.progressFill} />
            </div>
            
            {/* Content */}
            <div style={styles.content}>
                <canvas 
                    ref={canvasRef}
                    width={config.width - 64}
                    height={config.height - 350}
                    style={styles.canvas}
                />
                
                <div style={styles.description}>
                    {currentStep?.description}
                </div>
            </div>
            
            {/* Navigation */}
            <div style={styles.navigation}>
                <button
                    onClick={prevStep}
                    disabled={currentStepIndex === 0 || isTransitioning}
                    onMouseEnter={() => handleButtonInteraction('prev', 'hover')}
                    onMouseLeave={() => handleButtonInteraction('prev', 'idle')}
                    onMouseDown={() => handleButtonInteraction('prev', 'active')}
                    onMouseUp={() => handleButtonInteraction('prev', 'hover')}
                    style={getButtonStyle('prev', {
                        ...styles.navButton,
                        background: currentStepIndex === 0 ? colors.border : colors.surface,
                        color: currentStepIndex === 0 ? colors.textSecondary : colors.text,
                        cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: currentStepIndex === 0 ? 0.5 : 1,
                    })}
                >
                    <ChevronLeft size={20} />
                    Previous
                </button>
                
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    onMouseEnter={() => handleButtonInteraction('play', 'hover')}
                    onMouseLeave={() => handleButtonInteraction('play', 'idle')}
                    onMouseDown={() => handleButtonInteraction('play', 'active')}
                    onMouseUp={() => handleButtonInteraction('play', 'hover')}
                    style={getButtonStyle('play', {
                        ...styles.playButton,
                        background: `linear-gradient(135deg, ${modeColors[selectedMode].from}, ${modeColors[selectedMode].to})`,
                    })}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
                
                <button
                    onClick={nextStep}
                    disabled={currentStepIndex === filteredSteps.length - 1 || isTransitioning}
                    onMouseEnter={() => handleButtonInteraction('next', 'hover')}
                    onMouseLeave={() => handleButtonInteraction('next', 'idle')}
                    onMouseDown={() => handleButtonInteraction('next', 'active')}
                    onMouseUp={() => handleButtonInteraction('next', 'hover')}
                    style={getButtonStyle('next', {
                        ...styles.navButton,
                        background: currentStepIndex === filteredSteps.length - 1 
                            ? colors.border 
                            : `linear-gradient(135deg, ${modeColors[selectedMode].from}, ${modeColors[selectedMode].to})`,
                        color: currentStepIndex === filteredSteps.length - 1 
                            ? colors.textSecondary 
                            : 'white',
                        cursor: currentStepIndex === filteredSteps.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: currentStepIndex === filteredSteps.length - 1 ? 0.5 : 1,
                    })}
                >
                    Next
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default NumberLineTool;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════
```

### TOOL SCHEMA JSON

```json
// ═══════════════════════════════════════════════════════════════════════════
// TOOL SCHEMA JSON START
// File: number_line_tool_schema.json
// ═══════════════════════════════════════════════════════════════════════════

{
    "toolName": "number_line_tool",
    "version": "1.0.0",
    "description": "Interactive number line tool for learning addition, subtraction, and number concepts",
    
    "parameters": {
        "width": {
            "type": "number",
            "default": 800,
            "description": "Component width in pixels"
        },
        "height": {
            "type": "number",
            "default": 600,
            "description": "Component height in pixels"
        },
        "initialMode": {
            "type": "string",
            "enum": ["learn", "practice", "real_world", "hands_on"],
            "default": "learn",
            "description": "Starting mode"
        },
        "showModeSelector": {
            "type": "boolean",
            "default": true,
            "description": "Show/hide mode selector tabs"
        },
        "showNavigation": {
            "type": "boolean",
            "default": true,
            "description": "Show/hide prev/next buttons"
        },
        "showPlayPause": {
            "type": "boolean",
            "default": true,
            "description": "Show/hide play/pause button"
        },
        "showStepIndicator": {
            "type": "boolean",
            "default": true,
            "description": "Show/hide step counter"
        },
        "initialStep": {
            "type": "number",
            "default": 1,
            "description": "Starting step ID"
        },
        "filterSteps": {
            "type": "array",
            "items": { "type": "number" },
            "default": null,
            "description": "Array of step IDs to show"
        },
        "autoPlayDuration": {
            "type": "number",
            "default": 8000,
            "description": "Auto-advance delay (0 = disabled)"
        },
        "animationSpeed": {
            "type": "number",
            "default": 1,
            "description": "Animation speed multiplier"
        },
        "themeColor": {
            "type": "string",
            "default": "#3b82f6",
            "description": "Primary theme color (hex)"
        },
        "darkMode": {
            "type": "boolean",
            "default": false,
            "description": "Enable dark mode"
        }
    },
    
    "additionalProps": {
        "description": "Tool-specific dynamic content passed by the agent",
        "schema": {
            "minValue": {
                "type": "number",
                "default": 0,
                "description": "Minimum value on number line"
            },
            "maxValue": {
                "type": "number",
                "default": 10,
                "description": "Maximum value on number line"
            },
            "step": {
                "type": "number",
                "default": 1,
                "description": "Interval between numbers"
            },
            "numbers": {
                "type": "array",
                "items": { "type": "number" },
                "default": null,
                "description": "Custom array of numbers to display (overrides min/max/step)"
            },
            "highlightNumbers": {
                "type": "array",
                "items": { "type": "number" },
                "default": [],
                "description": "Numbers to highlight with color"
            },
            "activeNumber": {
                "type": "number",
                "default": null,
                "description": "Currently active/selected number"
            },
            "showOperations": {
                "type": "boolean",
                "default": false,
                "description": "Show addition/subtraction jump arcs"
            },
            "operations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": { "type": "string", "enum": ["add", "subtract"] },
                        "from": { "type": "number" },
                        "value": { "type": "number" },
                        "color": { "type": "string" },
                        "label": { "type": "string" }
                    },
                    "required": ["type", "from", "value"]
                },
                "default": [],
                "description": "Operations to visualize with animated arcs"
            },
            "customMarkers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "position": { "type": "number" },
                        "label": { "type": "string" },
                        "color": { "type": "string" },
                        "icon": { "type": "string", "enum": ["star", "flag", "dot", "arrow"] }
                    },
                    "required": ["position", "label", "color"]
                },
                "default": [],
                "description": "Custom markers to display on the number line"
            },
            "lineColor": {
                "type": "string",
                "default": "#64748b",
                "description": "Color of the main number line"
            },
            "markerSize": {
                "type": "number",
                "default": 40,
                "description": "Size of number markers in pixels"
            },
            "showLabels": {
                "type": "boolean",
                "default": true,
                "description": "Show number labels"
            },
            "showTicks": {
                "type": "boolean",
                "default": true,
                "description": "Show tick marks on line"
            },
            "interactive": {
                "type": "boolean",
                "default": false,
                "description": "Allow clicking on numbers"
            }
        },
        "examples": {
            "basic": {
                "minValue": 0,
                "maxValue": 10
            },
            "negative_numbers": {
                "minValue": -5,
                "maxValue": 5,
                "highlightNumbers": [0]
            },
            "skip_counting": {
                "numbers": [0, 2, 4, 6, 8, 10],
                "highlightNumbers": [4, 8]
            },
            "addition_example": {
                "minValue": 0,
                "maxValue": 10,
                "showOperations": true,
                "operations": [
                    { "type": "add", "from": 3, "value": 4, "label": "+4" }
                ],
                "highlightNumbers": [3, 7]
            },
            "subtraction_example": {
                "minValue": 0,
                "maxValue": 10,
                "showOperations": true,
                "operations": [
                    { "type": "subtract", "from": 8, "value": 3, "label": "-3", "color": "#ef4444" }
                ],
                "highlightNumbers": [8, 5]
            },
            "multiple_operations": {
                "minValue": 0,
                "maxValue": 15,
                "showOperations": true,
                "operations": [
                    { "type": "add", "from": 2, "value": 5, "color": "#10b981" },
                    { "type": "add", "from": 7, "value": 3, "color": "#3b82f6" }
                ],
                "highlightNumbers": [2, 7, 10]
            },
            "with_markers": {
                "minValue": 0,
                "maxValue": 10,
                "customMarkers": [
                    { "position": 0, "label": "Start", "color": "#10b981" },
                    { "position": 10, "label": "Goal", "color": "#ef4444" }
                ]
            },
            "fractions": {
                "numbers": [0, 0.5, 1, 1.5, 2, 2.5, 3],
                "highlightNumbers": [1.5],
                "step": 0.5
            },
            "large_numbers": {
                "minValue": 0,
                "maxValue": 100,
                "step": 10,
                "highlightNumbers": [50]
            }
        }
    },
    
    "modes": {
        "learn": {
            "steps": [1, 2, 3, 4, 5],
            "description": "Step-by-step number line concepts"
        },
        "practice": {
            "steps": [10, 11, 12],
            "description": "Interactive number line problems"
        },
        "real_world": {
            "steps": [20, 21, 22],
            "description": "Temperature, ruler, timeline examples"
        },
        "hands_on": {
            "steps": [30, 31],
            "description": "Build your own number line"
        }
    },
    
    "stepSummary": {
        "1": { "title": "What is a Number Line?", "mode": "learn" },
        "2": { "title": "Numbers in Order", "mode": "learn" },
        "3": { "title": "Addition on Number Line", "mode": "learn" },
        "4": { "title": "Subtraction on Number Line", "mode": "learn" },
        "5": { "title": "Comparing Numbers", "mode": "learn" },
        "10": { "title": "Find the Number", "mode": "practice" },
        "11": { "title": "Addition Practice", "mode": "practice" },
        "12": { "title": "Subtraction Practice", "mode": "practice" },
        "20": { "title": "Temperature Scale", "mode": "real_world" },
        "21": { "title": "Measuring Distance", "mode": "real_world" },
        "22": { "title": "Timeline of Events", "mode": "real_world" },
        "30": { "title": "Build Your Number Line", "mode": "hands_on" },
        "31": { "title": "Create Operations", "mode": "hands_on" }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL SCHEMA JSON END
// ═══════════════════════════════════════════════════════════════════════════
```

### AGENT README

```markdown
// ═══════════════════════════════════════════════════════════════════════════
// AGENT README START  
// File: number_line_tool_agent_readme.md
// ═══════════════════════════════════════════════════════════════════════════

# Number Line Tool - Agent Instructions

## Overview

The Number Line Tool is an interactive educational component for teaching number concepts, addition, subtraction, and number comparison. It supports dynamic content via `additionalProps` allowing agents to customize the number range, highlight specific numbers, and visualize operations.

---

## Quick Reference Table

| Student Request | Mode | Key Parameters |
|-----------------|------|----------------|
| "Teach me number line" | learn | `initialMode: "learn"` |
| "Practice addition" | practice | `initialMode: "practice", filterSteps: [11]` |
| "Show me 3 + 5" | learn | Use `additionalProps.operations` |
| "Numbers 1 to 20" | learn | `additionalProps: { minValue: 1, maxValue: 20 }` |
| "Negative numbers" | learn | `additionalProps: { minValue: -10, maxValue: 10 }` |
| "Skip counting by 2s" | learn | `additionalProps: { numbers: [0,2,4,6,8,10] }` |

---

## Visibility Control Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `showModeSelector` | `true` | Hide mode tabs for focused experience |
| `showNavigation` | `true` | Hide prev/next for auto-play or static display |
| `showPlayPause` | `true` | Hide play/pause button |
| `showStepIndicator` | `true` | Hide step counter |

---

## additionalProps Reference

### Number Range Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `minValue` | number | 0 | Minimum value on number line |
| `maxValue` | number | 10 | Maximum value on number line |
| `step` | number | 1 | Interval between numbers |
| `numbers` | number[] | null | Custom array (overrides min/max/step) |

### Visual Highlighting

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `highlightNumbers` | number[] | [] | Numbers to highlight |
| `activeNumber` | number | null | Currently selected number |
| `lineColor` | string | "#64748b" | Main line color |
| `markerSize` | number | 40 | Size of number circles |

### Operations (Addition/Subtraction Visualization)

| Property | Type | Description |
|----------|------|-------------|
| `showOperations` | boolean | Enable operation arcs |
| `operations` | array | Array of operation objects |

**Operation Object Structure:**
```json
{
    "type": "add" | "subtract",
    "from": number,
    "value": number,
    "color": string (optional),
    "label": string (optional)
}
```

### Custom Markers

```json
{
    "position": number,
    "label": string,
    "color": string,
    "icon": "star" | "flag" | "dot" | "arrow" (optional)
}
```

---

## Tool Call Examples

### Example 1: Basic Number Line (0-10)
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Learn Number Lines",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "initialMode": "learn",
            "showModeSelector": true,
            "additionalProps": {
                "minValue": 0,
                "maxValue": 10
            }
        }
    },
    "instructions_for_student": "Explore the number line from 0 to 10!"
}
```

### Example 2: Show Addition 3 + 5 = 8
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Addition: 3 + 5",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "initialMode": "learn",
            "showModeSelector": false,
            "showNavigation": false,
            "additionalProps": {
                "minValue": 0,
                "maxValue": 10,
                "showOperations": true,
                "operations": [
                    {
                        "type": "add",
                        "from": 3,
                        "value": 5,
                        "color": "#10b981",
                        "label": "+5"
                    }
                ],
                "highlightNumbers": [3, 8],
                "activeNumber": 8
            }
        }
    },
    "instructions_for_student": "Watch how we jump 5 steps from 3 to reach 8!"
}
```

### Example 3: Subtraction 9 - 4 = 5
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Subtraction: 9 - 4",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "showModeSelector": false,
            "showNavigation": false,
            "additionalProps": {
                "minValue": 0,
                "maxValue": 10,
                "showOperations": true,
                "operations": [
                    {
                        "type": "subtract",
                        "from": 9,
                        "value": 4,
                        "color": "#ef4444",
                        "label": "-4"
                    }
                ],
                "highlightNumbers": [9, 5],
                "activeNumber": 5
            }
        }
    },
    "instructions_for_student": "See how we jump 4 steps LEFT from 9 to reach 5!"
}
```

### Example 4: Negative Numbers (-10 to 10)
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Negative Numbers",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "initialMode": "learn",
            "additionalProps": {
                "minValue": -10,
                "maxValue": 10,
                "step": 2,
                "highlightNumbers": [0],
                "customMarkers": [
                    { "position": 0, "label": "Zero", "color": "#f59e0b" }
                ]
            }
        }
    },
    "instructions_for_student": "Numbers to the left of zero are negative!"
}
```

### Example 5: Skip Counting by 5s
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Skip Counting by 5",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "showModeSelector": false,
            "additionalProps": {
                "numbers": [0, 5, 10, 15, 20, 25, 30],
                "highlightNumbers": [5, 10, 15, 20, 25, 30]
            }
        }
    },
    "instructions_for_student": "Count by 5s: 5, 10, 15, 20, 25, 30!"
}
```

### Example 6: Multiple Operations (Chain Calculation)
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Solve: 2 + 4 + 3 = ?",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "showModeSelector": false,
            "additionalProps": {
                "minValue": 0,
                "maxValue": 12,
                "showOperations": true,
                "operations": [
                    { "type": "add", "from": 2, "value": 4, "color": "#3b82f6", "label": "+4" },
                    { "type": "add", "from": 6, "value": 3, "color": "#10b981", "label": "+3" }
                ],
                "highlightNumbers": [2, 6, 9],
                "activeNumber": 9,
                "customMarkers": [
                    { "position": 2, "label": "Start", "color": "#3b82f6" },
                    { "position": 9, "label": "Answer", "color": "#10b981" }
                ]
            }
        }
    },
    "instructions_for_student": "First add 4 to get 6, then add 3 to get 9!"
}
```

### Example 7: Fractions on Number Line
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Fractions on Number Line",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "additionalProps": {
                "numbers": [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
                "highlightNumbers": [0.5, 1, 1.5],
                "customMarkers": [
                    { "position": 0.5, "label": "1/2", "color": "#8b5cf6" },
                    { "position": 1.5, "label": "1½", "color": "#8b5cf6" }
                ]
            }
        }
    },
    "instructions_for_student": "See where fractions fall between whole numbers!"
}
```

### Example 8: Minimal UI Demo (Auto-play)
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Number Line Demo",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "showModeSelector": false,
            "showNavigation": false,
            "showPlayPause": false,
            "showStepIndicator": false,
            "autoPlayDuration": 0,
            "additionalProps": {
                "minValue": 1,
                "maxValue": 10,
                "highlightNumbers": [5],
                "activeNumber": 5
            }
        }
    },
    "instructions_for_student": "The number 5 is right in the middle!"
}
```

### Example 9: Large Numbers (0-100)
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Numbers to 100",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "additionalProps": {
                "minValue": 0,
                "maxValue": 100,
                "step": 10,
                "highlightNumbers": [50],
                "customMarkers": [
                    { "position": 50, "label": "Half", "color": "#f59e0b" }
                ]
            }
        }
    },
    "instructions_for_student": "50 is halfway between 0 and 100!"
}
```

### Example 10: Temperature Example
```json
{
    "frontend_action": "show_interactive_tool",
    "title": "Temperature Number Line",
    "data": {
        "toolName": "number_line_tool",
        "parameters": {
            "initialMode": "real_world",
            "filterSteps": [20],
            "additionalProps": {
                "minValue": -20,
                "maxValue": 40,
                "step": 10,
                "highlightNumbers": [0],
                "customMarkers": [
                    { "position": 0, "label": "Freezing", "color": "#06b6d4" },
                    { "position": 20, "label": "Room Temp", "color": "#10b981" },
                    { "position": 37, "label": "Body Temp", "color": "#ef4444" }
                ],
                "lineColor": "#06b6d4"
            }
        }
    },
    "instructions_for_student": "Thermometers are vertical number lines! Water freezes at 0°C."
}
```

---

## Decision Tree for Agents

```
Student asks about numbers/math
    │
    ├─ "What is a number line?"
    │   └─ Use: initialMode: "learn", showModeSelector: true
    │
    ├─ "Show me [X] + [Y]" or "Add [X] and [Y]"
    │   └─ Use: additionalProps.operations with type: "add"
    │
    ├─ "Show me [X] - [Y]" or "Subtract [Y] from [X]"
    │   └─ Use: additionalProps.operations with type: "subtract"
    │
    ├─ "Numbers from [A] to [B]"
    │   └─ Use: additionalProps: { minValue: A, maxValue: B }
    │
    ├─ "Count by [N]s" or "Skip counting"
    │   └─ Use: additionalProps: { step: N } or custom numbers array
    │
    ├─ "Negative numbers"
    │   └─ Use: additionalProps: { minValue: -X, maxValue: X }
    │
    ├─ "Practice problems"
    │   └─ Use: initialMode: "practice"
    │
    └─ "Real world examples"
        └─ Use: initialMode: "real_world"
```

---

## Tips for Agents

1. **For single operations**: Use `additionalProps.operations` with one operation object
2. **For comparisons**: Use `highlightNumbers` to mark the numbers being compared
3. **For word problems**: Extract numbers and operation, visualize with operations array
4. **For minimal distractions**: Set `showModeSelector: false, showNavigation: false`
5. **For static display**: Set `autoPlayDuration: 0` and hide navigation
6. **For custom ranges**: Always set both `minValue` and `maxValue`
7. **For fractions/decimals**: Use `numbers` array with decimal values

---

## Error Handling

- If `operations.from` value not in number range: Arc won't display
- If `highlightNumbers` contains values outside range: Those won't highlight
- Invalid `initialMode`: Defaults to "learn"
- Empty `additionalProps`: Uses default 0-10 number line

// ═══════════════════════════════════════════════════════════════════════════
// AGENT README END
// ═══════════════════════════════════════════════════════════════════════════
```

---

## VALIDATION CHECKLIST

Before using generated output, verify:

- [ ] Component uses ONLY inline styles and CSS-in-JS (NO Tailwind)
- [ ] All animation keyframes are injected via useEffect
- [ ] Props interface includes `additionalProps` with proper typing
- [ ] Default values handle all undefined additionalProps
- [ ] additionalProps changes trigger re-animation
- [ ] Canvas/SVG renders content based on additionalProps
- [ ] Mode selector can be hidden
- [ ] Navigation buttons can be hidden
- [ ] filterSteps properly filters available steps
- [ ] JSON schema documents all additionalProps with examples
- [ ] Agent README includes quick reference table
- [ ] Agent README includes 8+ tool call examples with various additionalProps
- [ ] Agent README includes decision tree for common queries

---

## ICONS

Use lucide-react for icons:

```tsx
import { 
    Play, 
    Pause, 
    ChevronLeft, 
    ChevronRight, 
    RotateCcw, 
    Check, 
    X, 
    Plus,
    Minus,
    BookOpen, 
    Target, 
    BarChart3, 
    FlaskConical,
    Zap,
    Star,
    Award
} from 'lucide-react';
```

---

## ANIMATION EASING FUNCTIONS

Include these helpers in every component:

```typescript
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number): number => 
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
const easeOutBounce = (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};
```
```

---

This updated prompt now includes:

1. **`additionalProps`** - A flexible object for tool-specific dynamic content
2. **Typed interfaces** for different tool types (NumberLine, Fraction, Graph, Geometry)
3. **Schema examples** showing various use cases
4. **10+ detailed tool call examples** with different `additionalProps` configurations
5. **Decision tree** for agents to quickly determine which props to use
6. **Complete JSON schema** with `additionalProps.examples` section

The agent can now dynamically pass numbers, operations, markers, and more to customize the tool for each student's specific question!