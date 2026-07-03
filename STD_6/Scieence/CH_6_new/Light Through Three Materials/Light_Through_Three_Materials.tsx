// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: materials_light_flow.tsx
// Chapter 6 — Materials Around Us | Transparent / Translucent / Opaque
//
// MERGED FLOW:
//   Phase 1  →  TorchMaterialViewer   (watch & learn the 3 material types)
//   Phase 2  →  MaterialsSorterTool   (sort objects — unlocked after learning)
//
// The wrapper (MaterialsLightFlow) is the default export. It shows the torch
// viewer first; when the student reaches the final learning step a "Start
// Practice" call-to-action appears, which swaps in the sorter game.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    ArrowRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED TYPES (used by both tools + wrapper)
// ═══════════════════════════════════════════════════════════════════════════

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';

interface StepDetails {
    currentStep: number;
    totalSteps: number;
    isPaused: boolean;
    currentMode: ModeType;
}

// ═══════════════════════════════════════════════════════════════════════════
// ███  TOOL 1 — TORCH MATERIAL VIEWER  ███
// ═══════════════════════════════════════════════════════════════════════════

type MaterialType = 'transparent' | 'translucent' | 'opaque';

interface MaterialDef {
    id: MaterialType;
    name: string;
    description: string;
    color: string;
    accent: string;
    opacity: number;
    blur: number;
    icon: string;
}

interface TorchStepData {
    id: number;
    title: string;
    description: string;
    type: 'intro' | 'explanation' | 'practice' | 'real_world' | 'hands_on';
    mode: ModeType;
    targetMaterial?: MaterialType;
}

interface TorchAdditionalProps {
    initialMaterial?: MaterialType;
    availableMaterials?: MaterialType[];
    showRuleCard?: boolean;
    customMaterials?: Partial<Record<MaterialType, Partial<MaterialDef>>>;
    autoCycle?: boolean;
    cycleInterval?: number;
    showLightBeam?: boolean;
    showCaption?: boolean;
    studentName?: string;
}

interface TorchMaterialViewerProps {
    props?: {
        width?: number;
        height?: number;
        data?: any;
        steps?: TorchStepData[];
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
        additionalProps?: TorchAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== DESIGN TOKENS (from design PDF) ====================

const THEME = {
    primary: '#4A4DC9',
    primaryDeep: '#533086',
    accent: '#FF7212',
    accentSoft: '#FC9145',
    lightPurple: '#C1C1EA',
    lightOrange: '#FFF3E4',
    grayDark: '#4E4E4E',
    grayMid: '#CACACA',
    grayLight: '#EBEBEB',
    bg: '#F5F5F5',
    white: '#FFFFFF',
    gradientPurple: 'linear-gradient(135deg, #533086 0%, #4A4DC9 100%)',
    gradientOrange: 'linear-gradient(135deg, #FF7212 0%, #FC9145 100%)',
    gradientSoftPurple: 'linear-gradient(135deg, #C1C1EA 0%, #E8E8F7 100%)',
    gradientSoftOrange: 'linear-gradient(135deg, #FFF3E4 0%, #FFE5C9 100%)',
    fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
};

// ==================== MATERIAL DEFINITIONS ====================

const MATERIALS: Record<MaterialType, MaterialDef> = {
    transparent: {
        id: 'transparent',
        name: 'Clear Glass',
        description: 'Light passes straight through — you see clearly',
        color: '#E0F2FE',
        accent: '#0EA5E9',
        opacity: 0.15,
        blur: 0,
        icon: '🪟',
    },
    translucent: {
        id: 'translucent',
        name: 'Butter Paper',
        description: 'Some light gets through — you see a fuzzy shape',
        color: '#FEF3C7',
        accent: '#F59E0B',
        opacity: 0.7,
        blur: 6,
        icon: '📄',
    },
    opaque: {
        id: 'opaque',
        name: 'Wooden Board',
        description: 'No light gets through — you see nothing',
        color: '#92400E',
        accent: '#78350F',
        opacity: 1,
        blur: 20,
        icon: '🪵',
    },
};

// ==================== DEFAULT STEPS ====================

const DEFAULT_STEPS: TorchStepData[] = [
    {
        id: 1,
        title: 'Meet the Torch',
        description: 'A torch on the left shines light to the right. Watch how different materials block or allow this light to pass through.',
        type: 'intro',
        mode: 'learn',
    },
    {
        id: 2,
        title: 'Transparent — Clear Glass',
        description: 'Slide to clear glass. Light passes straight through and you can see your friend clearly. We call this TRANSPARENT.',
        type: 'explanation',
        mode: 'learn',
        targetMaterial: 'transparent',
    },
    {
        id: 3,
        title: 'Translucent — Butter Paper',
        description: 'Now butter paper. Some light gets through but the image is fuzzy. We call this TRANSLUCENT.',
        type: 'explanation',
        mode: 'learn',
        targetMaterial: 'translucent',
    },
    {
        id: 4,
        title: 'Opaque — Wooden Board',
        description: 'Finally wood. No light gets through and your friend is completely hidden. We call this OPAQUE.',
        type: 'explanation',
        mode: 'learn',
        targetMaterial: 'opaque',
    },
    {
        id: 5,
        title: 'Try It Yourself',
        description: 'Slide the switch freely. For each material, decide if it is transparent, translucent, or opaque before reading the label.',
        type: 'hands_on',
        mode: 'hands_on',
    },
    {
        id: 6,
        title: 'Real World',
        description: 'Windows are transparent. Frosted bathroom glass is translucent. Walls and doors are opaque. Look around — what do you see?',
        type: 'real_world',
        mode: 'real_world',
    },
];

// ==================== KEYFRAME ANIMATIONS ====================

const keyframes = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes popIn {
        0% { transform: scale(0); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }
    @keyframes materialDropIn {
        0% { transform: translateY(-30px) scale(0.92); opacity: 0; }
        60% { transform: translateY(4px) scale(1.02); opacity: 1; }
        80% { transform: translateY(-1px) scale(0.99); }
        100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 114, 18, 0.6); }
        50% { box-shadow: 0 0 0 18px rgba(255, 114, 18, 0); }
    }
    @keyframes bulbGlow {
        0%, 100% { opacity: 0.85; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.08); }
    }
    @keyframes bulbCore {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.95; }
    }
    @keyframes lightFlicker {
        0%, 100% { opacity: 1; }
        47% { opacity: 0.92; }
        50% { opacity: 0.78; }
        53% { opacity: 0.95; }
    }
    @keyframes photonFlow {
        0% { transform: translateX(0); opacity: 0; }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { transform: translateX(var(--photon-distance, 200px)); opacity: 0; }
    }
    @keyframes photonScatter {
        0% { transform: translate(0, 0); opacity: 0; }
        20% { opacity: 0.9; }
        100% { transform: translate(var(--scatter-x, 30px), var(--scatter-y, -20px)); opacity: 0; }
    }
    @keyframes photonBounceBack {
        0% { transform: translateX(0); opacity: 0; }
        15% { opacity: 1; }
        45% { transform: translateX(var(--photon-distance, 100px)); opacity: 1; }
        55% { transform: translateX(var(--photon-distance, 100px)) scale(1.4); opacity: 1; }
        100% { transform: translateX(0); opacity: 0; }
    }
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(40px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-40px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes captionMorph {
        0% { transform: scale(0.85) translateY(8px); opacity: 0; filter: blur(4px); }
        60% { transform: scale(1.04) translateY(-2px); opacity: 1; filter: blur(0); }
        100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
    }
    @keyframes breathe {
        0%, 100% { transform: scaleY(1); transform-origin: center bottom; }
        50% { transform: scaleY(1.015); transform-origin: center bottom; }
    }
    @keyframes wave {
        0%   { transform: rotate(-30deg); }
        30%  { transform: rotate(5deg);  }
        60%  { transform: rotate(-25deg); }
        80%  { transform: rotate(0deg);  }
        100% { transform: rotate(-30deg); }
    }
    @keyframes friendTilt {
        0%, 100% { transform: rotate(0deg); transform-origin: center bottom; }
        50% { transform: rotate(-2deg); transform-origin: center bottom; }
    }
    @keyframes blink {
        0%, 92%, 100% { transform: scaleY(1); }
        95% { transform: scaleY(0.1); }
    }
    @keyframes drawRule {
        from { width: 0; opacity: 0; }
        to { width: 100%; opacity: 1; }
    }
    @keyframes beamPulse {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 1; }
    }
    @keyframes impactRipple {
        0% { transform: scale(0); opacity: 0.7; }
        100% { transform: scale(2.5); opacity: 0; }
    }
    @keyframes paperScatterDot {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.55; }
    }
    @keyframes glassShimmer {
        0%, 100% { opacity: 0.4; transform: translateY(0); }
        50% { opacity: 0.75; transform: translateY(2px); }
    }
    @keyframes questionPulse {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.15); opacity: 1; }
    }
`;

// ==================== EASING ====================

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// ==================== TORCH COMPONENT ====================

const TorchMaterialViewer: React.FC<TorchMaterialViewerProps> = ({
    props: rawProps,
    setStepDetails,
    stopAutoNext,
    setStopAutoNext,
}) => {
    const props: NonNullable<TorchMaterialViewerProps['props']> = rawProps ?? {};
    // ---- Config defaults
    const config = {
        width: props.width ?? 900,
        height: props.height ?? 640,
        initialMode: (props.initialMode ?? 'learn') as ModeType,
        showModeSelector: props.showModeSelector ?? true,
        enabledModes: props.enabledModes ?? ['learn', 'practice', 'real_world', 'hands_on'],
        showNavigation: props.showNavigation ?? true,
        showPlayPause: props.showPlayPause ?? true,
        showStepIndicator: props.showStepIndicator ?? true,
        initialStep: props.initialStep ?? 1,
        filterSteps: props.filterSteps,
        animationSpeed: props.animationSpeed ?? 1,
        autoPlayDuration: props.autoPlayDuration ?? 9000,
        themeColor: props.themeColor ?? THEME.primary,
        darkMode: props.darkMode ?? false,
        steps: props.steps ?? DEFAULT_STEPS,
    };

    const additional: TorchAdditionalProps = props.additionalProps ?? {};
    const {
        initialMaterial = 'transparent',
        availableMaterials = ['transparent', 'translucent', 'opaque'],
        showRuleCard = true,
        showLightBeam = true,
        showCaption = true,
        autoCycle = false,
        cycleInterval = 2500,
    } = additional;

    // ---- State
    const [currentMode] = useState<ModeType>(config.initialMode);
    const [filteredSteps, setFilteredSteps] = useState<TorchStepData[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>(initialMaterial);
    const [containerWidth, setContainerWidth] = useState<number>(config.width);
    const [transitionKey, setTransitionKey] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    // ---- Inject keyframes
    useEffect(() => {
        const id = 'torch-material-viewer-keyframes';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = keyframes;
        document.head.appendChild(style);
        return () => {
            const el = document.getElementById(id);
            if (el) document.head.removeChild(el);
        };
    }, []);

    // ---- Responsive sizing
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const isMobile = containerWidth < 640;
    const isTablet = containerWidth >= 640 && containerWidth < 900;

    // ---- Filter steps by mode + filterSteps
    useEffect(() => {
        let result = config.steps.filter(s => s.mode === currentMode);
        if (config.filterSteps && config.filterSteps.length > 0) {
            result = result.filter(s => config.filterSteps!.includes(s.id));
        }
        if (result.length === 0) result = config.steps.filter(s => s.mode === 'learn');
        setFilteredSteps(result);
        setCurrentStepIndex(0);
    }, [currentMode, props.steps, props.filterSteps]);

    // ---- Sync material from step target
    useEffect(() => {
        const step = filteredSteps[currentStepIndex];
        if (step?.targetMaterial && availableMaterials.includes(step.targetMaterial)) {
            setSelectedMaterial(step.targetMaterial);
            setTransitionKey(k => k + 1);
        }
    }, [currentStepIndex, filteredSteps]);

    // ---- Report step details to parent
    useEffect(() => {
        if (setStepDetails && filteredSteps.length > 0) {
            setStepDetails({
                currentStep: currentStepIndex + 1,
                totalSteps: filteredSteps.length,
                isPaused,
                currentMode,
            });
        }
    }, [currentStepIndex, filteredSteps.length, isPaused, currentMode, setStepDetails]);

    // ---- Auto-play
    useEffect(() => {
        if (isPaused || stopAutoNext || config.autoPlayDuration === 0) return;
        if (filteredSteps.length === 0) return;
        const t = setTimeout(() => {
            setCurrentStepIndex(i => (i + 1) % filteredSteps.length);
        }, config.autoPlayDuration / config.animationSpeed);
        return () => clearTimeout(t);
    }, [isPaused, currentStepIndex, filteredSteps.length, stopAutoNext]);

    // ---- Auto-cycle materials (optional, agent-controlled)
    useEffect(() => {
        if (!autoCycle) return;
        const t = setInterval(() => {
            setSelectedMaterial(curr => {
                const idx = availableMaterials.indexOf(curr);
                const next = availableMaterials[(idx + 1) % availableMaterials.length];
                setTransitionKey(k => k + 1);
                return next;
            });
        }, cycleInterval);
        return () => clearInterval(t);
    }, [autoCycle, cycleInterval, availableMaterials]);

    // ---- Handlers
    const handleMaterialChange = useCallback((m: MaterialType) => {
        if (!availableMaterials.includes(m)) return;
        setSelectedMaterial(m);
        setTransitionKey(k => k + 1);
        if (setStopAutoNext) setStopAutoNext(true);
    }, [availableMaterials, setStopAutoNext]);

    const goNext = useCallback(() => {
        setCurrentStepIndex(i => Math.min(i + 1, filteredSteps.length - 1));
    }, [filteredSteps.length]);

    const goPrev = useCallback(() => {
        setCurrentStepIndex(i => Math.max(i - 1, 0));
    }, []);

    const reset = useCallback(() => {
        setCurrentStepIndex(0);
        setSelectedMaterial(initialMaterial);
        setIsPaused(true);
        setTransitionKey(k => k + 1);
    }, [initialMaterial]);

    const currentStep = filteredSteps[currentStepIndex];
    const currentMaterial = MATERIALS[selectedMaterial];

    // ==================== STYLES ====================

    const styles: { [k: string]: React.CSSProperties } = useMemo(() => ({
        root: {
            width: '100%',
            maxWidth: '100%',
            minHeight: isMobile ? 'auto' : config.height,
            background: THEME.bg,
            borderRadius: isMobile ? 18 : 24,
            padding: isMobile ? 14 : isTablet ? 20 : 28,
            fontFamily: THEME.fontFamily,
            color: THEME.grayDark,
            boxShadow: '0 20px 50px -20px rgba(74, 77, 201, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 12 : 18,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
        },
        header: {
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        title: {
            fontSize: isMobile ? 18 : 22,
            fontWeight: 700,
            color: THEME.primaryDeep,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        },
        stage: {
            background: THEME.white,
            borderRadius: 20,
            padding: isMobile ? 14 : 22,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 14 : 18,
            position: 'relative',
            overflow: 'hidden',
            minHeight: isMobile ? 'auto' : 280,
            border: `1.5px solid ${THEME.grayLight}`,
        },
        stageColumn: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            flex: isMobile ? '0 0 auto' : '1 1 0',
            minWidth: 0,
            width: isMobile ? '100%' : 'auto',
        },
        stageLabel: {
            fontSize: isMobile ? 11 : 12,
            fontWeight: 600,
            color: THEME.grayDark,
            textTransform: 'uppercase' as const,
            letterSpacing: 1,
        },
        caption: {
            marginTop: 8,
            padding: isMobile ? '10px 16px' : '12px 22px',
            borderRadius: 999,
            background: currentMaterial.id === 'transparent'
                ? 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)'
                : currentMaterial.id === 'translucent'
                ? THEME.gradientOrange
                : 'linear-gradient(135deg, #4E4E4E 0%, #1F1F1F 100%)',
            color: THEME.white,
            fontSize: isMobile ? 14 : 16,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase' as const,
            boxShadow: '0 8px 22px -8px rgba(0,0,0,0.3)',
            animation: `captionMorph 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)`,
        },
        sliderWrap: {
            background: THEME.gradientSoftPurple,
            borderRadius: 18,
            padding: isMobile ? '14px 12px' : '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
        },
        sliderTitle: {
            fontSize: isMobile ? 12 : 13,
            fontWeight: 600,
            color: THEME.primaryDeep,
            textAlign: 'center' as const,
            marginBottom: 2,
        },
        slider: {
            display: 'flex',
            background: THEME.white,
            borderRadius: 999,
            padding: 4,
            position: 'relative',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.06)',
        },
        sliderOption: (active: boolean): React.CSSProperties => ({
            flex: 1,
            padding: isMobile ? '8px 6px' : '10px 12px',
            borderRadius: 999,
            cursor: 'pointer',
            border: 'none',
            background: active ? THEME.gradientPurple : 'transparent',
            color: active ? THEME.white : THEME.primaryDeep,
            fontSize: isMobile ? 11 : 13,
            fontWeight: 600,
            fontFamily: THEME.fontFamily,
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transform: active ? 'scale(1.02)' : 'scale(1)',
            boxShadow: active ? '0 6px 14px -6px rgba(83, 48, 134, 0.5)' : 'none',
            whiteSpace: 'nowrap' as const,
        }),
        instructionBar: {
            background: THEME.gradientSoftOrange,
            borderRadius: 14,
            padding: isMobile ? '10px 14px' : '12px 18px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            borderLeft: `4px solid ${THEME.accent}`,
        },
        instructionText: {
            fontSize: isMobile ? 12 : 14,
            color: THEME.grayDark,
            margin: 0,
            lineHeight: 1.45,
            fontWeight: 500,
        },
        ruleCard: {
            background: THEME.white,
            borderRadius: 16,
            padding: isMobile ? 12 : 16,
            border: `1.5px solid ${THEME.grayLight}`,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 8 : 12,
        },
        ruleItem: (color: string): React.CSSProperties => ({
            padding: isMobile ? 10 : 12,
            borderRadius: 12,
            background: `${color}12`,
            borderLeft: `3px solid ${color}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            animation: 'fadeInUp 0.5s ease-out both',
        }),
        ruleLabel: (color: string): React.CSSProperties => ({
            fontSize: isMobile ? 12 : 13,
            fontWeight: 700,
            color: color,
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
        }),
        ruleDesc: {
            fontSize: isMobile ? 11 : 12,
            color: THEME.grayDark,
            lineHeight: 1.4,
            margin: 0,
        },
        controls: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 'auto',
            flexWrap: 'wrap',
        },
        navBtn: (disabled: boolean): React.CSSProperties => ({
            width: isMobile ? 38 : 44,
            height: isMobile ? 38 : 44,
            borderRadius: 999,
            border: 'none',
            background: disabled ? THEME.grayLight : THEME.gradientPurple,
            color: disabled ? THEME.grayMid : THEME.white,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: disabled ? 'none' : '0 6px 14px -6px rgba(83, 48, 134, 0.5)',
        }),
        playBtn: {
            padding: isMobile ? '8px 14px' : '10px 18px',
            borderRadius: 999,
            border: 'none',
            background: THEME.gradientOrange,
            color: THEME.white,
            cursor: 'pointer',
            fontSize: isMobile ? 12 : 13,
            fontWeight: 600,
            fontFamily: THEME.fontFamily,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 14px -6px rgba(255, 114, 18, 0.5)',
        },
        stepDot: (active: boolean): React.CSSProperties => ({
            width: active ? 24 : 8,
            height: 8,
            borderRadius: 999,
            background: active ? THEME.gradientPurple : THEME.lightPurple,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
        }),
        stepDots: {
            display: 'flex',
            gap: 6,
            alignItems: 'center',
        },
    }), [isMobile, isTablet, config.height, selectedMaterial]);

    // ==================== STAGE PIECES ====================

    // Fixed logical canvas — SVG scales via viewBox, responsive via CSS
    const SW = 700;            // design width
    const SH = 260;            // design height
    const CY = SH / 2;         // centre Y

    // Element positions in design units
    const TX = 18;             // torch left edge
    const TIP_X = TX + 88;    // torch tip / bulb X
    const MAT_X = 270;         // material slab left
    const MAT_W = 58;
    const MAT_H = 118;
    const MAT_CY = CY - MAT_H / 2;
    const FRIEND_X = 530;      // friend group left
    const F_W = 60;
    const F_H = 80;            // head+body+legs — fits comfortably in 260px stage
    const FRIEND_CY = CY - F_H / 2;

    // Friend visibility
    const friendOpacity = currentMaterial.id === 'opaque' ? 0
        : currentMaterial.id === 'translucent' ? 0.55 : 1;
    const friendBlur = currentMaterial.blur;

    const renderStage = () => {
        const beamY = CY;
        const matRightX = MAT_X + MAT_W;
        const distTorchToMat = MAT_X - TIP_X;
        const distMatToFriend = FRIEND_X - matRightX;

        const photonsBefore = 4;
        const photonsAfter = currentMaterial.id === 'transparent' ? 4 : currentMaterial.id === 'translucent' ? 2 : 0;
        const scatterPhotons = currentMaterial.id === 'translucent' ? 6 : 0;
        const bounceBackPhotons = currentMaterial.id === 'opaque' ? 3 : 0;

        return (
        <div style={{
            width: '100%',
            height: isMobile ? 200 : 240,
            background: currentMaterial.id === 'opaque'
                ? 'linear-gradient(180deg, #F5F4FA 0%, #E8E6F3 100%)'
                : 'linear-gradient(180deg, #FAFBFF 0%, #F0EEFA 100%)',
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
            border: `1.5px solid ${THEME.grayLight}`,
            transition: 'background 0.6s ease',
        }}>
            <svg
                viewBox={`0 0 ${SW} ${SH}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block' }}
            >
                <defs>
                    {/* Light beam gradient (cone of light) */}
                    <linearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFE49A" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#FFC36F" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="beamSoft" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFE49A" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#FFD89A" stopOpacity="0" />
                    </linearGradient>
                    <radialGradient id="bulbGlow" cx="50%" cy="50%">
                        <stop offset="0%" stopColor="#FFF6C2" stopOpacity="1" />
                        <stop offset="60%" stopColor="#FFD56E" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#FFB84D" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="bulbHalo" cx="50%" cy="50%">
                        <stop offset="0%" stopColor="#FFF6C2" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#FFB84D" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="photonGlow" cx="50%" cy="50%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                        <stop offset="40%" stopColor="#FFF6C2" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#FFB84D" stopOpacity="0" />
                    </radialGradient>
                    {/* Per-material material fill */}
                    <pattern id="woodPattern" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(8)">
                        <rect width="20" height="20" fill="#92400E" />
                        <line x1="0" y1="0" x2="0" y2="20" stroke="#6B2E08" strokeWidth="1.5" />
                        <line x1="10" y1="0" x2="10" y2="20" stroke="#7C3409" strokeWidth="0.8" />
                    </pattern>
                    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.95" />
                    </linearGradient>
                    {/* Blur filter for friend silhouette when translucent */}
                    <filter id="friendBlur" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation={friendBlur} />
                    </filter>
                    {/* Soft glow for photons */}
                    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
                    </filter>
                </defs>

                {/* Ground line */}
                <line x1="10" y1={SH - 28} x2={SW - 10} y2={SH - 28}
                    stroke={THEME.grayMid} strokeWidth="1.5" strokeDasharray="4 4" />

                {/* ===== TORCH ===== */}
                <g transform={`translate(${TX}, ${CY - 28})`}>
                    <rect x="0" y="8" width="52" height="38" rx="8" fill={THEME.primaryDeep} />
                    <rect x="0" y="8" width="52" height="8" rx="4" fill={THEME.primary} />
                    <line x1="8" y1="24" x2="44" y2="24" stroke={THEME.primary} strokeWidth="1" opacity="0.5" />
                    <line x1="8" y1="31" x2="44" y2="31" stroke={THEME.primary} strokeWidth="1" opacity="0.5" />
                    <line x1="8" y1="38" x2="44" y2="38" stroke={THEME.primary} strokeWidth="1" opacity="0.5" />
                    <polygon points="52,2 88,0 88,56 52,54"
                        fill={THEME.primary} stroke={THEME.primaryDeep} strokeWidth="1.5" />
                    <circle cx="86" cy="28" r="20" fill="url(#bulbHalo)"
                        style={{ animation: 'bulbGlow 1.8s ease-in-out infinite', transformOrigin: '86px 28px' }} />
                    <circle cx="86" cy="28" r="11" fill="url(#bulbGlow)"
                        style={{ animation: 'lightFlicker 2.4s ease-in-out infinite' }} />
                    <circle cx="86" cy="28" r="4.5" fill="#FFF6C2"
                        style={{ animation: 'bulbCore 1.4s ease-in-out infinite' }} />
                    <rect x="16" y="18" width="14" height="5" rx="2" fill={THEME.accent} />
                    <circle cx="23" cy="21" r="1.4" fill="#FFFFFF" opacity="0.6" />
                </g>

                {/* ===== BEAM before material ===== */}
                {showLightBeam && (
                    <g style={{ animation: 'beamPulse 2.4s ease-in-out infinite' }}>
                        <polygon
                            points={`${TIP_X},${beamY - 18} ${MAT_X},${beamY - 46} ${MAT_X},${beamY + 46} ${TIP_X},${beamY + 18}`}
                            fill="url(#beamSoft)"
                            opacity={currentMaterial.id === 'opaque' ? 0.65 : 0.9}
                        />
                        <polygon
                            points={`${TIP_X},${beamY - 10} ${MAT_X},${beamY - 30} ${MAT_X},${beamY + 30} ${TIP_X},${beamY + 10}`}
                            fill="url(#beam)"
                            opacity={currentMaterial.id === 'transparent' ? 1 : currentMaterial.id === 'translucent' ? 0.75 : 0.85}
                        />
                    </g>
                )}

                {/* ===== PHOTONS torch to material ===== */}
                {showLightBeam && Array.from({ length: photonsBefore }).map((_, i) => {
                    const lane = (i - (photonsBefore - 1) / 2) * 11;
                    return (
                        <circle key={`p-pre-${i}-${transitionKey}`}
                            cx={TIP_X + 4} cy={beamY + lane} r="2.4"
                            fill="url(#photonGlow)" filter="url(#softGlow)"
                            style={{
                                ['--photon-distance' as any]: `${distTorchToMat - 8}px`,
                                animation: `photonFlow 1.6s linear ${i * 0.4}s infinite`,
                            } as React.CSSProperties} />
                    );
                })}

                {/* ===== TRANSMITTED BEAM after material ===== */}
                {currentMaterial.id === 'transparent' && (
                    <polygon
                        points={`${matRightX},${beamY - 30} ${FRIEND_X - 4},${beamY - 52} ${FRIEND_X - 4},${beamY + 52} ${matRightX},${beamY + 30}`}
                        fill="url(#beam)" opacity="0.9"
                        style={{ animation: 'beamPulse 2.4s ease-in-out infinite' }} />
                )}
                {currentMaterial.id === 'translucent' && (
                    <polygon
                        points={`${matRightX},${beamY - 30} ${FRIEND_X - 4},${beamY - 52} ${FRIEND_X - 4},${beamY + 52} ${matRightX},${beamY + 30}`}
                        fill="url(#beamSoft)" opacity="0.4"
                        style={{ animation: 'beamPulse 2.4s ease-in-out infinite' }} />
                )}

                {/* ===== PHOTONS material to friend ===== */}
                {photonsAfter > 0 && Array.from({ length: photonsAfter }).map((_, i) => {
                    const lane = (i - (photonsAfter - 1) / 2) * 14;
                    return (
                        <circle key={`p-post-${i}-${transitionKey}`}
                            cx={matRightX + 4} cy={beamY + lane}
                            r={currentMaterial.id === 'transparent' ? 2.4 : 1.8}
                            fill="url(#photonGlow)" filter="url(#softGlow)"
                            opacity={currentMaterial.id === 'transparent' ? 1 : 0.6}
                            style={{
                                ['--photon-distance' as any]: `${distMatToFriend - 8}px`,
                                animation: `photonFlow ${currentMaterial.id === 'transparent' ? 1.6 : 2.2}s linear ${i * 0.5 + 0.3}s infinite`,
                            } as React.CSSProperties} />
                    );
                })}

                {/* ===== SCATTER PHOTONS at translucent ===== */}
                {scatterPhotons > 0 && Array.from({ length: scatterPhotons }).map((_, i) => {
                    const angle = (i / scatterPhotons) * Math.PI * 2;
                    const dx = Math.cos(angle) * 26;
                    const dy = Math.sin(angle) * 26;
                    return (
                        <circle key={`p-scatter-${i}-${transitionKey}`}
                            cx={MAT_X + MAT_W / 2} cy={beamY} r="1.6"
                            fill="#FFE49A" filter="url(#softGlow)"
                            style={{
                                ['--scatter-x' as any]: `${dx}px`,
                                ['--scatter-y' as any]: `${dy}px`,
                                animation: `photonScatter 1.4s ease-out ${i * 0.18}s infinite`,
                            } as React.CSSProperties} />
                    );
                })}

                {/* ===== BOUNCE-BACK at opaque ===== */}
                {bounceBackPhotons > 0 && (
                    <>
                        {Array.from({ length: bounceBackPhotons }).map((_, i) => {
                            const lane = (i - (bounceBackPhotons - 1) / 2) * 12;
                            return (
                                <circle key={`p-bounce-${i}-${transitionKey}`}
                                    cx={TIP_X + 4} cy={beamY + lane} r="2.2"
                                    fill="url(#photonGlow)" filter="url(#softGlow)"
                                    style={{
                                        ['--photon-distance' as any]: `${distTorchToMat - 10}px`,
                                        animation: `photonBounceBack 2.4s ease-in-out ${i * 0.45}s infinite`,
                                    } as React.CSSProperties} />
                            );
                        })}
                        {[0, 0.8, 1.6].map((delay, i) => (
                            <circle key={`ripple-${i}-${transitionKey}`}
                                cx={MAT_X} cy={beamY} r="6"
                                fill="none" stroke="#FFB84D" strokeWidth="1.5" opacity="0"
                                style={{
                                    transformOrigin: `${MAT_X}px ${beamY}px`,
                                    animation: `impactRipple 2.4s ease-out ${delay}s infinite`,
                                }} />
                        ))}
                    </>
                )}

                {/* ===== MATERIAL slab (middle) ===== */}
                <g key={`mat-${transitionKey}`}
                    transform={`translate(${MAT_X}, ${MAT_CY})`}
                    style={{ animation: 'materialDropIn 0.7s cubic-bezier(0.34,1.56,0.64,1)', transformOrigin: 'center center' }}>
                    <rect x="-7" y="-7" width={MAT_W + 14} height={MAT_H + 14} rx="10"
                        fill="none" stroke={THEME.lightPurple} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />

                    {currentMaterial.id === 'transparent' && (
                        <>
                            <rect x="0" y="0" width={MAT_W} height={MAT_H} rx="5" fill="url(#glassGrad)" stroke="#7DD3FC" strokeWidth="2" />
                            <line x1="12" y1="10" x2="12" y2="55" stroke="#FFF" strokeWidth="3" opacity="0.7" strokeLinecap="round"
                                style={{ animation: 'glassShimmer 3s ease-in-out infinite' }} />
                            <line x1="44" y1="68" x2="44" y2="103" stroke="#FFF" strokeWidth="2" opacity="0.5" strokeLinecap="round"
                                style={{ animation: 'glassShimmer 3.6s ease-in-out infinite 0.4s' }} />
                            <polygon points="2,2 16,2 2,16" fill="#FFF" opacity="0.3" />
                        </>
                    )}
                    {currentMaterial.id === 'translucent' && (
                        <>
                            <rect x="0" y="0" width={MAT_W} height={MAT_H} rx="5" fill="url(#paperGrad)" stroke="#F59E0B" strokeWidth="2" />
                            {Array.from({ length: 12 }).map((_, i) => (
                                <circle key={i} cx={8 + (i % 3) * 18} cy={12 + Math.floor(i / 3) * 26}
                                    r="1.4" fill="#D97706" opacity="0.3"
                                    style={{ animation: `paperScatterDot ${2 + (i % 3) * 0.4}s ease-in-out ${i * 0.1}s infinite` }} />
                            ))}
                            {[18, 52, 86].map(y => (
                                <line key={y} x1="0" y1={y} x2={MAT_W} y2={y}
                                    stroke="#FCD34D" strokeWidth="0.5" opacity="0.5" />
                            ))}
                        </>
                    )}
                    {currentMaterial.id === 'opaque' && (
                        <>
                            <rect x="0" y="0" width={MAT_W} height={MAT_H} rx="5" fill="url(#woodPattern)" stroke="#5C2306" strokeWidth="2" />
                            <ellipse cx="29" cy="44" rx="8" ry="5" fill="#5C2306" opacity="0.7" />
                            <ellipse cx="29" cy="44" rx="4" ry="2.5" fill="#3F1604" />
                            <ellipse cx="18" cy="86" rx="4" ry="2.5" fill="#5C2306" opacity="0.6" />
                        </>
                    )}
                </g>

                {/* ===== FRIEND ===== */}
                <g transform={`translate(${FRIEND_X}, ${FRIEND_CY})`}>
                    {currentMaterial.id !== 'opaque' ? (
                        <g
                            opacity={friendOpacity}
                            filter={friendBlur > 0 ? 'url(#friendBlur)' : undefined}
                            style={{
                                transition: 'opacity 0.6s ease',
                                animation: currentMaterial.id === 'translucent'
                                    ? 'friendTilt 3.2s ease-in-out infinite'
                                    : 'breathe 3.6s ease-in-out infinite',
                                transformOrigin: `30px ${F_H}px`,
                            }}
                        >
                            <circle cx="30" cy="14" r="14" fill={THEME.primaryDeep} />
                            <rect x="16" y="27" width="28" height="28" rx="8" fill={THEME.primaryDeep} />
                            <rect x="7" y="28" width="10" height="22" rx="5" fill={THEME.primaryDeep} />
                            {currentMaterial.id === 'transparent' ? (
                                <g style={{ transformOrigin: '44px 32px', animation: 'wave 1.8s ease-in-out infinite' }}>
                                    <rect x="40" y="14" width="9" height="20" rx="4" fill={THEME.primaryDeep} />
                                    <rect x="42" y="0" width="8" height="16" rx="4"
                                        transform="rotate(15 46 14)" fill={THEME.primaryDeep} />
                                    <circle cx="46" cy="2" r="5" fill={THEME.primaryDeep} />
                                </g>
                            ) : (
                                <rect x="43" y="28" width="10" height="22" rx="5" fill={THEME.primaryDeep} />
                            )}
                            <rect x="17" y="53" width="11" height="22" rx="5" fill={THEME.primaryDeep} />
                            <rect x="32" y="53" width="11" height="22" rx="5" fill={THEME.primaryDeep} />
                            {currentMaterial.id === 'transparent' && (
                                <>
                                    <ellipse cx="24" cy="12" rx="2.5" ry="3" fill="#FFF"
                                        style={{ transformOrigin: '24px 12px', animation: 'blink 4s ease-in-out infinite' }} />
                                    <ellipse cx="36" cy="12" rx="2.5" ry="3" fill="#FFF"
                                        style={{ transformOrigin: '36px 12px', animation: 'blink 4s ease-in-out infinite' }} />
                                    <circle cx="24" cy="12" r="1.1" fill={THEME.primaryDeep} />
                                    <circle cx="36" cy="12" r="1.1" fill={THEME.primaryDeep} />
                                    <path d="M 22 21 Q 30 26 38 21" stroke="#FFF" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                                </>
                            )}
                        </g>
                    ) : (
                        <g>
                            <circle cx="30" cy="14" r="14" fill={THEME.primaryDeep} opacity="0.15" />
                            <rect x="16" y="27" width="28" height="28" rx="8" fill={THEME.primaryDeep} opacity="0.15" />
                            <rect x="7" y="28" width="10" height="22" rx="5" fill={THEME.primaryDeep} opacity="0.15" />
                            <rect x="43" y="28" width="10" height="22" rx="5" fill={THEME.primaryDeep} opacity="0.15" />
                            <rect x="17" y="53" width="11" height="22" rx="5" fill={THEME.primaryDeep} opacity="0.15" />
                            <rect x="32" y="53" width="11" height="22" rx="5" fill={THEME.primaryDeep} opacity="0.15" />
                            <rect x="0" y="0" width={F_W} height={F_H} rx="10" fill="#111" opacity="0.84" />
                            <text x="30" y="46" textAnchor="middle"
                                fill={THEME.accent} fontSize="26" fontWeight="700"
                                fontFamily={THEME.fontFamily}
                                style={{ transformOrigin: '30px 36px', animation: 'questionPulse 1.8s ease-in-out infinite' }}
                            >?</text>
                        </g>
                    )}
                </g>

                {/* Stage labels */}
                <text x={TX + 44} y={SH - 10} textAnchor="middle"
                    fill={THEME.grayDark} fontSize="11" fontWeight="600" fontFamily={THEME.fontFamily}>TORCH</text>
                <text x={MAT_X + MAT_W / 2} y={SH - 10} textAnchor="middle"
                    fill={THEME.grayDark} fontSize="11" fontWeight="600" fontFamily={THEME.fontFamily}>MATERIAL</text>
                <text x={FRIEND_X + F_W / 2} y={SH - 10} textAnchor="middle"
                    fill={THEME.grayDark} fontSize="11" fontWeight="600" fontFamily={THEME.fontFamily}>FRIEND</text>
            </svg>
        </div>
        );
    };

    // ==================== RENDER ====================

    return (
        <div ref={containerRef} style={styles.root}>
            {/* HEADER */}
            <div style={styles.header}>
                <h2 style={styles.title}>
                    <svg width={isMobile ? 18 : 22} height={isMobile ? 18 : 22} viewBox="0 0 24 24" fill="none"
                        stroke={THEME.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6c0-2-1.5-4-4-4S8 4 8 6l2 8h6l2-8z" />
                        <path d="M10 14v4a2 2 0 0 0 4 0v-4" />
                        <line x1="8" y1="6" x2="16" y2="6" />
                        <circle cx="12" cy="5" r="1" fill={THEME.accent} />
                    </svg>
                    Torch &amp; Material Stage
                </h2>
            </div>

            {/* INSTRUCTION BAR (current step) */}
            {currentStep && (
                <div
                    key={`step-${currentStep.id}`}
                    style={{ ...styles.instructionBar, animation: 'fadeInUp 0.5s ease-out' }}
                >
                    <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: THEME.gradientOrange,
                        color: THEME.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                    }}>
                        {currentStep.id}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: isMobile ? 13 : 15,
                            fontWeight: 700,
                            color: THEME.primaryDeep,
                            marginBottom: 2,
                        }}>
                            {currentStep.title}
                        </div>
                        <p style={styles.instructionText}>{currentStep.description}</p>
                    </div>
                </div>
            )}

            {/* 3-POSITION SLIDER */}
            <div style={styles.sliderWrap}>
                <div style={styles.sliderTitle}>Slide to swap material</div>
                <div style={styles.slider}>
                    {availableMaterials.map(m => {
                        const def = MATERIALS[m];
                        const active = selectedMaterial === m;
                        return (
                            <button
                                key={m}
                                onClick={() => handleMaterialChange(m)}
                                style={styles.sliderOption(active)}
                                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F0EEFA'; }}
                                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ fontSize: isMobile ? 14 : 16 }}>{def.icon}</span>
                                <span>{def.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* STAGE */}
            <div style={styles.stage}>
                {renderStage()}
            </div>

            {/* CAPTION */}
            {showCaption && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div key={`cap-${transitionKey}`} style={styles.caption}>
                        {currentMaterial.id === 'transparent' && '✓ Transparent — Clear View'}
                        {currentMaterial.id === 'translucent' && '◐ Translucent — Fuzzy Shape'}
                        {currentMaterial.id === 'opaque' && '✕ Opaque — Blacked Out'}
                    </div>
                </div>
            )}

            {/* RULE CARD */}
            {showRuleCard && (
                <div style={styles.ruleCard}>
                    {(['transparent', 'translucent', 'opaque'] as MaterialType[]).map((m, i) => {
                        const def = MATERIALS[m];
                        const color = m === 'transparent' ? '#0EA5E9' : m === 'translucent' ? THEME.accent : THEME.grayDark;
                        return (
                            <div key={m} style={{ ...styles.ruleItem(color), animationDelay: `${i * 0.08}s` }}>
                                <div style={styles.ruleLabel(color)}>{m}</div>
                                <p style={styles.ruleDesc}>{def.description}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CONTROLS */}
            {(config.showNavigation || config.showPlayPause || config.showStepIndicator) && (
                <div style={styles.controls}>
                    {config.showNavigation && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={goPrev}
                                disabled={currentStepIndex === 0}
                                style={styles.navBtn(currentStepIndex === 0)}
                                onMouseEnter={e => { if (currentStepIndex !== 0) e.currentTarget.style.transform = 'scale(1.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                aria-label="Previous step"
                            >
                                <ChevronLeft size={isMobile ? 18 : 20} />
                            </button>
                            <button
                                onClick={goNext}
                                disabled={currentStepIndex >= filteredSteps.length - 1}
                                style={styles.navBtn(currentStepIndex >= filteredSteps.length - 1)}
                                onMouseEnter={e => { if (currentStepIndex < filteredSteps.length - 1) e.currentTarget.style.transform = 'scale(1.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                aria-label="Next step"
                            >
                                <ChevronRight size={isMobile ? 18 : 20} />
                            </button>
                            <button
                                onClick={reset}
                                style={{ ...styles.navBtn(false), background: THEME.white, color: THEME.primary, border: `1.5px solid ${THEME.lightPurple}` }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                aria-label="Reset"
                            >
                                <RotateCcw size={isMobile ? 16 : 18} />
                            </button>
                        </div>
                    )}

                    {config.showStepIndicator && filteredSteps.length > 1 && (
                        <div style={styles.stepDots}>
                            {filteredSteps.map((_, i) => (
                                <div
                                    key={i}
                                    onClick={() => setCurrentStepIndex(i)}
                                    style={styles.stepDot(i === currentStepIndex)}
                                />
                            ))}
                        </div>
                    )}

                    {config.showPlayPause && filteredSteps.length > 1 && (
                        <button
                            onClick={() => setIsPaused(p => !p)}
                            style={styles.playBtn}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {isPaused ? <Play size={isMobile ? 12 : 14} /> : <Pause size={isMobile ? 12 : 14} />}
                            {isPaused ? 'Play' : 'Pause'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// ███  TOOL 2 — MATERIALS SORTER  ███
// ═══════════════════════════════════════════════════════════════════════════

type CategoryId = 'transparent' | 'translucent' | 'opaque';

interface SorterStepData {
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

interface ObjectTile {
  id: string;
  name: string;
  emoji: string;
  category: CategoryId;
  reason: string;
  hint: string;
}

interface SorterAdditionalProps {
  objects?: ObjectTile[];
  showHints?: boolean;
  shuffleSeed?: number;
  enableTimer?: boolean;
  showTableOnComplete?: boolean;
  successMessage?: string;
  binLabels?: { transparent?: string; translucent?: string; opaque?: string };
}

interface MaterialsSorterProps {
  props?: {
    width?: number;
    height?: number;
    data?: BaseDataInterface;
    steps?: SorterStepData[];
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
    additionalProps?: SorterAdditionalProps;
  };
  setStepDetails?: (stepDetails: StepDetails) => void;
  stopAutoNext?: boolean;
  setStopAutoNext?: (stopAutoNext: boolean) => void;
}

// ==================== INLINE SVG ICONS ====================

const IconCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRotate: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#6B7280' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconClock: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconEye: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconHaze: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M5 8h14M5 16h14" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 19v2" />
  </svg>
);

// ==================== DEFAULT OBJECTS — Activity 6.6 ====================

const DEFAULT_OBJECTS: ObjectTile[] = [
  {
    id: 'glass_tumbler', name: 'Glass tumbler', emoji: '🥃', category: 'transparent',
    reason: 'Clear glass — you can see straight through it.',
    hint: 'Hold a glass up — can you read the words behind it clearly?',
  },
  {
    id: 'butter_paper', name: 'Butter paper', emoji: '📄', category: 'translucent',
    reason: 'Light passes through, but the view is blurry — not clear.',
    hint: 'Light gets through, but shapes look hazy. Not fully clear, not fully blocked.',
  },
  {
    id: 'eraser', name: 'Eraser', emoji: '🩹', category: 'opaque',
    reason: 'No light passes through — completely blocks the view.',
    hint: 'Try shining a torch behind it. Does any light come through?',
  },
  {
    id: 'frosted_glass', name: 'Frosted glass', emoji: '🪟', category: 'translucent',
    reason: 'Blurry — light passes but no clear view.',
    hint: 'Light gets through, but you only see fuzzy outlines.',
  },
  {
    id: 'wooden_board', name: 'Wooden board', emoji: '🪵', category: 'opaque',
    reason: 'Wood blocks all light — you cannot see through it.',
    hint: 'Wood is dense — light has no way through.',
  },
  {
    id: 'window_glass', name: 'Window glass', emoji: '🏠', category: 'transparent',
    reason: 'A clear window — you see the outside view clearly.',
    hint: 'Think of a clean window pane. Can you see the garden through it?',
  },
];

// ==================== HELPERS ====================

function shuffleArray<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let s = seed ?? Date.now();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const formatTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ==================== DESIGN SYSTEM (Singularity palette) ====================

const C = {
  primary: '#4A4DC9',
  orange: '#FF7212',
  purple: '#533086',
  amber: '#FC9145',
  lightPurple: '#C1C1EA',
  lightOrange: '#FFF3E4',
  dark: '#4E4E4E',
  grey: '#CACACA',
  bgGrey: '#EBEBEB',
  bgLight: '#F5F5F5',
  white: '#FFFFFF',
  green: '#22C55E',
  greenBg: '#DCFCE7',
  greenBorder: '#86EFAC',
  red: '#EF4444',
  redBg: '#FEE2E2',
  redBorder: '#FCA5A5',
  transBg: 'linear-gradient(160deg, #EEF2FF, #F8F9FF)',
  transBgHov: 'linear-gradient(160deg, #C7D2FE, #EEF2FF)',
  transBorder: '#C1C1EA',
  transBorderHov: '#4A4DC9',
  transGlow: 'rgba(74,77,201,0.22)',
  transTag: '#312E81',
  transChipBg: '#C7D2FE',
  transChipColor: '#312E81',
  hazeBg: 'linear-gradient(160deg, #FFF3E4, #FFFBF5)',
  hazeBgHov: 'linear-gradient(160deg, #FFE5C7, #FFF3E4)',
  hazeBorder: '#FC9145',
  hazeBorderHov: '#FF7212',
  hazeGlow: 'rgba(252,145,69,0.25)',
  hazeTag: '#92400E',
  hazeChipBg: '#FFD9B3',
  hazeChipColor: '#92400E',
  opaBg: 'linear-gradient(160deg, #F3F0F8, #F8F5FF)',
  opaBgHov: 'linear-gradient(160deg, #D8CFE8, #F3F0F8)',
  opaBorder: '#C1C1EA',
  opaBorderHov: '#533086',
  opaGlow: 'rgba(83,48,134,0.22)',
  opaTag: '#2D1052',
  opaChipBg: '#D8CFE8',
  opaChipColor: '#2D1052',
};

// ==================== BIN DEFINITIONS ====================

interface BinDef {
  id: CategoryId;
  emoji: string;
  defaultLabel: string;
  subTag: string;
  bg: string;
  bgHov: string;
  border: string;
  borderHov: string;
  glow: string;
  tagColor: string;
  chipBg: string;
  chipColor: string;
  icon: React.ReactElement;
  shimmer: boolean;
  animClass: string;
}

const BIN_DEFS: BinDef[] = [
  {
    id: 'transparent', emoji: '🔍', defaultLabel: 'Transparent',
    subTag: 'See clearly through it',
    bg: C.transBg, bgHov: C.transBgHov, border: C.transBorder, borderHov: C.transBorderHov,
    glow: C.transGlow, tagColor: C.transTag, chipBg: C.transChipBg, chipColor: C.transChipColor,
    icon: <IconEye size={16} color="#312E81" />, shimmer: true, animClass: 'mst-slideInLeft',
  },
  {
    id: 'translucent', emoji: '🌫️', defaultLabel: 'Translucent',
    subTag: 'Blurry — light passes through',
    bg: C.hazeBg, bgHov: C.hazeBgHov, border: C.hazeBorder, borderHov: C.hazeBorderHov,
    glow: C.hazeGlow, tagColor: C.hazeTag, chipBg: C.hazeChipBg, chipColor: C.hazeChipColor,
    icon: <IconHaze size={16} color="#92400E" />, shimmer: true, animClass: 'mst-slideInCenter',
  },
  {
    id: 'opaque', emoji: '🧱', defaultLabel: 'Opaque',
    subTag: 'Cannot see through it',
    bg: C.opaBg, bgHov: C.opaBgHov, border: C.opaBorder, borderHov: C.opaBorderHov,
    glow: C.opaGlow, tagColor: C.opaTag, chipBg: C.opaChipBg, chipColor: C.opaChipColor,
    icon: <IconEyeOff size={16} color="#2D1052" />, shimmer: false, animClass: 'mst-slideInRight',
  },
];

// ==================== GLOBAL STYLES ====================

const STYLE_BLOCK = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .mst-root *, .mst-root *::before, .mst-root *::after { box-sizing: border-box; }

  @keyframes mst-fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mst-popIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.12); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes mst-shake {
    0%, 100%       { transform: translateX(0); }
    10%, 50%, 90%  { transform: translateX(-6px); }
    30%, 70%       { transform: translateX(6px); }
  }
  @keyframes mst-slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mst-slideInCenter {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mst-slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mst-confettiFall {
    0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes mst-tileFadeIn {
    from { opacity: 0; transform: scale(0.85) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mst-hintFade {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes mst-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes mst-starSpin {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.3); }
    to   { transform: rotate(360deg) scale(1); }
  }
  @keyframes mst-tableRowIn {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`;

// ==================== CONFETTI ====================

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = [C.primary, C.orange, C.purple, C.amber, C.lightPurple, C.green, '#FFD700'];
  const pieces = Array.from({ length: 55 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    delay: Math.random() * 2.5, duration: 2.2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 9, isCircle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-3%',
          width: p.size, height: p.isCircle ? p.size : p.size * 0.5,
          backgroundColor: p.color, borderRadius: p.isCircle ? '50%' : '2px',
          animation: `mst-confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
};

// ==================== STAT CARD ====================

const StatCard: React.FC<{
  label: string; value: string | number; emoji: string;
  bg: string; color: string; border: string; isMobile: boolean;
}> = ({ label, value, emoji, bg, color, border, isMobile }) => (
  <div style={{
    background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
    padding: isMobile ? '10px 8px' : '12px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  }}>
    <span style={{ fontSize: isMobile ? 16 : 18 }}>{emoji}</span>
    <span style={{
      fontSize: isMobile ? 16 : 19, fontWeight: 800, color,
      fontFamily: "'Poppins', sans-serif", fontVariantNumeric: 'tabular-nums',
    }}>{value}</span>
    <span style={{
      fontSize: isMobile ? 9 : 10, fontWeight: 600, color, opacity: 0.75,
      textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Poppins', sans-serif",
    }}>{label}</span>
  </div>
);

// ==================== SORTER COMPONENT ====================

const MaterialsSorterTool: React.FC<MaterialsSorterProps> = ({
  props = {}, setStepDetails,
}) => {
  const config = useMemo(() => ({
    width: props.width ?? 980,
    themeColor: props.themeColor ?? C.primary,
  }), [props.width, props.themeColor]);

  const ap = props.additionalProps || {};
  const objects: ObjectTile[] = ap.objects ?? DEFAULT_OBJECTS;
  const showHints = ap.showHints ?? true;
  const enableTimer = ap.enableTimer ?? true;
  const showTableOnComplete = ap.showTableOnComplete ?? true;
  const successMessage = ap.successMessage ?? 'Brilliant! You filled Table 6.4 correctly.';
  const binLabels: Record<CategoryId, string> = {
    transparent: ap.binLabels?.transparent ?? 'Transparent',
    translucent: ap.binLabels?.translucent ?? 'Translucent',
    opaque: ap.binLabels?.opaque ?? 'Opaque',
  };
  const totalTiles = objects.length;

  // ─── STATE ───
  const [unsorted, setUnsorted] = useState<ObjectTile[]>([]);
  const [bins, setBins] = useState<Record<CategoryId, ObjectTile[]>>({ transparent: [], translucent: [], opaque: [] });
  const [selected, setSelected] = useState<ObjectTile | null>(null);
  const [feedback, setFeedback] = useState<{ tileId: string; text: string; type: 'correct' | 'wrong' } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoveredBin, setHoveredBin] = useState<CategoryId | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 980
  );
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsortedRef = useRef<ObjectTile[]>([]);
  unsortedRef.current = unsorted;

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 900;

  // ─── INIT ───
  useEffect(() => {
    const shuffled = shuffleArray(objects, ap.shuffleSeed);
    setUnsorted(shuffled);
    setBins({ transparent: [], translucent: [], opaque: [] });
    setSelected(null); setFeedback(null);
    setCorrectCount(0); setWrongCount(0);
    setIsComplete(false); setShowConfetti(false);
    setShakingId(null); setIsBusy(false);
    setSeconds(0); setTimerRunning(true);
    setTimeout(() => setMounted(true), 50);
  }, [objects]);

  // ─── STYLES ───
  useEffect(() => {
    const existing = document.getElementById('mst-styles');
    if (existing) return;
    const el = document.createElement('style');
    el.id = 'mst-styles';
    el.textContent = STYLE_BLOCK;
    document.head.appendChild(el);
    return () => {
      const e = document.getElementById('mst-styles');
      if (e) document.head.removeChild(e);
    };
  }, []);

  // ─── VIEWPORT ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── TIMER ───
  useEffect(() => {
    if (!enableTimer || !timerRunning || isComplete) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [enableTimer, timerRunning, isComplete]);

  // ─── STEP DETAILS ───
  useEffect(() => {
    if (!setStepDetails) return;
    const sorted = Object.values(bins).reduce((a, b) => a + b.length, 0);
    setStepDetails({ currentStep: sorted, totalSteps: totalTiles, isPaused: false, currentMode: 'practice' });
  }, [bins, totalTiles, setStepDetails]);

  // ─── SORT LOGIC ───
  const sortTile = useCallback((tile: ObjectTile, binId: CategoryId) => {
    if (isBusy) return;
    if (fbTimer.current) clearTimeout(fbTimer.current);
    setIsBusy(true);

    const correct = tile.category === binId;

    if (correct) {
      setCorrectCount(c => c + 1);
      setFeedback({ tileId: tile.id, text: tile.reason, type: 'correct' });
      setUnsorted(prev => prev.filter(t => t.id !== tile.id));
      setBins(prev => ({ ...prev, [binId]: [...prev[binId], tile] }));
      setSelected(null);

      fbTimer.current = setTimeout(() => {
        setFeedback(null);
        setIsBusy(false);
      }, 2200);

      const remaining = unsortedRef.current.filter(t => t.id !== tile.id).length;
      if (remaining <= 0) {
        setTimeout(() => {
          setIsComplete(true);
          setTimerRunning(false);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4500);
        }, 900);
      }
    } else {
      setWrongCount(w => w + 1);
      setShakingId(tile.id);
      if (showHints) setFeedback({ tileId: tile.id, text: tile.hint, type: 'wrong' });
      setSelected(null);
      fbTimer.current = setTimeout(() => {
        setShakingId(null);
        setFeedback(null);
        setIsBusy(false);
      }, 2500);
    }
    setHoveredBin(null);
  }, [isBusy, showHints]);

  const handleTileTap = useCallback((tile: ObjectTile) => {
    if (isBusy) return;
    if (selected?.id === tile.id) { setSelected(null); return; }
    setSelected(tile);
    setFeedback(null);
  }, [selected, isBusy]);

  const handleBinTap = useCallback((binId: CategoryId) => {
    if (!selected || isBusy) return;
    sortTile(selected, binId);
  }, [selected, sortTile, isBusy]);

  const handleDragStart = useCallback((tile: ObjectTile) => {
    if (isBusy) return;
    setSelected(tile);
    setFeedback(null);
  }, [isBusy]);

  const handleDrop = useCallback((binId: CategoryId) => {
    if (!selected || isBusy) return;
    sortTile(selected, binId);
  }, [selected, sortTile, isBusy]);

  const resetGame = useCallback(() => {
    const shuffled = shuffleArray(objects, Date.now());
    setUnsorted(shuffled);
    setBins({ transparent: [], translucent: [], opaque: [] });
    setSelected(null); setFeedback(null);
    setCorrectCount(0); setWrongCount(0);
    setIsComplete(false); setShowConfetti(false);
    setShakingId(null); setIsBusy(false);
    setSeconds(0); setTimerRunning(true);
  }, [objects]);

  // ─── DERIVED ───
  const sortedCount = Object.values(bins).reduce((a, b) => a + b.length, 0);
  const progressPct = totalTiles > 0 ? (sortedCount / totalTiles) * 100 : 0;
  const accuracy = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 100;

  // ─── RESPONSIVE ───
  const tileMinWidth = isMobile ? 98 : isTablet ? 115 : 128;
  const tileEmojiSize = isMobile ? 26 : 30;
  const tileFontSize = isMobile ? 10 : 11;
  const binMinHeight = isMobile ? 148 : 168;
  const headerTitleSize = isMobile ? 15 : 18;
  const pad = isMobile ? 12 : 18;
  const binCols = isMobile ? '1fr' : 'repeat(3, 1fr)';

  // ==================== RENDER ====================
  return (
    <div className="mst-root" style={{
      width: '100%', maxWidth: config.width,
      margin: '0 auto', fontFamily: "'Poppins', sans-serif",
      background: '#FAFAFA', borderRadius: 20, overflow: 'hidden', position: 'relative',
      boxShadow: '0 8px 40px rgba(74,77,201,0.10), 0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #E5E7EB',
    }}>
      <Confetti active={showConfetti} />

      {/* ══════════════════ HEADER ══════════════════ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purple} 0%, ${C.primary} 100%)`,
        padding: isMobile ? '14px 16px 12px' : '18px 24px 14px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -24, left: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 10 : 0,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: isMobile ? 20 : 24 }}>👁️</span>
              <h2 style={{
                margin: 0, fontSize: headerTitleSize, fontWeight: 800, color: C.white,
                fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                Sort by Light Transparency
              </h2>
            </div>
            <p style={{
              margin: '4px 0 0 36px', fontSize: isMobile ? 10 : 11.5, fontWeight: 400,
              color: 'rgba(255,255,255,0.70)', fontFamily: "'Poppins', sans-serif",
            }}>
              Chapter 6 — Activity 6.6&nbsp;|&nbsp;Materials Around Us
            </p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
          }}>
            <div style={chipStyle('rgba(34,197,94,0.22)', 'rgba(134,239,172,0.5)')}>
              <IconCheck size={12} color="#BBF7D0" />
              <span style={chipText}>{correctCount}</span>
            </div>
            <div style={chipStyle('rgba(239,68,68,0.22)', 'rgba(252,165,165,0.5)')}>
              <IconX size={12} color="#FECACA" />
              <span style={chipText}>{wrongCount}</span>
            </div>
            {enableTimer && (
              <div style={chipStyle('rgba(255,255,255,0.18)', 'rgba(255,255,255,0.25)')}>
                <IconClock size={12} color="#fff" />
                <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{formatTime(seconds)}</span>
              </div>
            )}
            <div style={chipStyle('rgba(255,255,255,0.15)', 'transparent')}>
              <span style={{ fontSize: 13 }}>🎯</span>
              <span style={{ ...chipText, fontVariantNumeric: 'tabular-nums' }}>{sortedCount}/{totalTiles}</span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: isMobile ? 12 : 14, height: 7,
          background: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: progressPct >= 100
              ? `linear-gradient(90deg, ${C.green}, #4ADE80)`
              : `linear-gradient(90deg, ${C.amber}, ${C.orange})`,
            width: `${progressPct}%`,
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: progressPct > 0 ? '0 0 10px rgba(255,114,18,0.4)' : 'none',
          }} />
        </div>
      </div>

      {/* ══════════════════ BODY ══════════════════ */}
      <div style={{
        padding: `${pad}px ${pad}px ${pad + 4}px`,
        display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14,
      }}>

        {!isComplete && (
          <p style={{
            textAlign: 'center', margin: 0,
            fontSize: isMobile ? 12 : 13, color: '#6B7280',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            animation: mounted ? 'mst-fadeInUp 0.4s ease-out both' : 'none',
            lineHeight: 1.45,
          }}>
            {selected
              ? <span>Tap a bin to place <strong style={{ color: C.primary }}>"{selected.name}"</strong></span>
              : <span>{isMobile ? 'Tap a tile, then tap a bin' : 'Tap a tile then tap a bin · or drag & drop'}</span>
            }
          </p>
        )}

        {!isComplete && (
          <div style={{ display: 'grid', gridTemplateColumns: binCols, gap: isMobile ? 10 : 12 }}>
            {BIN_DEFS.map((bin) => {
              const isHov = hoveredBin === bin.id;
              const binItems = bins[bin.id];

              return (
                <div
                  key={bin.id}
                  onDragOver={e => { e.preventDefault(); setHoveredBin(bin.id); }}
                  onDragLeave={() => setHoveredBin(null)}
                  onDrop={e => { e.preventDefault(); handleDrop(bin.id); }}
                  onClick={() => handleBinTap(bin.id)}
                  style={{
                    minHeight: binMinHeight, borderRadius: 16,
                    padding: isMobile ? 12 : 14,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: isHov ? bin.bgHov : bin.bg,
                    border: `2.5px dashed ${isHov ? bin.borderHov : bin.border}`,
                    cursor: selected ? 'pointer' : 'default',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    transform: isHov ? 'scale(1.015)' : 'scale(1)',
                    boxShadow: isHov
                      ? `0 0 0 4px ${bin.glow}, 0 8px 24px ${bin.glow}`
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    animation: `${bin.animClass} 0.5s ease-out both`,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {bin.shimmer && (
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'mst-shimmer 4s ease-in-out infinite',
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: isMobile ? 18 : 20 }}>{bin.emoji}</span>
                    <span style={{
                      fontSize: isMobile ? 14 : 16, fontWeight: 800,
                      color: bin.tagColor, fontFamily: "'Poppins', sans-serif",
                    }}>
                      {binLabels[bin.id]}
                    </span>
                    {bin.icon}
                  </div>

                  <span style={{
                    fontSize: isMobile ? 10 : 11, fontWeight: 500,
                    color: bin.tagColor, opacity: 0.72,
                    position: 'relative', zIndex: 1, textAlign: 'center',
                  }}>
                    {binItems.length} sorted · {bin.subTag}
                  </span>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    {binItems.map((t, ci) => (
                      <span key={t.id} style={{
                        fontSize: isMobile ? 9 : 10, padding: '3px 8px', borderRadius: 10,
                        background: bin.chipBg, color: bin.chipColor, fontWeight: 600,
                        fontFamily: "'Poppins', sans-serif",
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        animation: `mst-popIn 0.35s ease-out ${ci * 0.04}s both`,
                      }}>
                        <span style={{ fontSize: 11 }}>{t.emoji}</span>
                        {t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {feedback && !isComplete && (
          <div style={{
            background: feedback.type === 'correct' ? C.greenBg : '#FEF3C7',
            border: `2px solid ${feedback.type === 'correct' ? C.greenBorder : '#F59E0B'}`,
            borderRadius: 12,
            padding: isMobile ? '10px 14px' : '11px 16px',
            fontSize: isMobile ? 11.5 : 12.5, fontWeight: 500,
            color: feedback.type === 'correct' ? '#166534' : '#92400E',
            fontFamily: "'Poppins', sans-serif", textAlign: 'center',
            animation: 'mst-hintFade 0.35s ease-out both',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            lineHeight: 1.4,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {feedback.type === 'correct' ? '✅' : '💡'}
            </span>
            <span>{feedback.text}</span>
          </div>
        )}

        {!isComplete && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${tileMinWidth}px, 1fr))`,
            gap: isMobile ? 8 : 10,
            padding: '4px 0', minHeight: 50,
          }}>
            {unsorted.map((tile, i) => {
              const isShaking = shakingId === tile.id;
              const isSel = selected?.id === tile.id;
              const isHov = hoveredTile === tile.id;
              return (
                <div
                  key={tile.id}
                  draggable={!isBusy}
                  onDragStart={() => handleDragStart(tile)}
                  onDragEnd={() => { setSelected(null); setHoveredBin(null); }}
                  onClick={() => handleTileTap(tile)}
                  onMouseEnter={() => setHoveredTile(tile.id)}
                  onMouseLeave={() => setHoveredTile(null)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: isMobile ? '10px 8px' : '12px 10px',
                    borderRadius: 14, background: C.white,
                    border: `2px solid ${isSel ? C.primary : isHov ? C.lightPurple : '#E5E7EB'}`,
                    cursor: isBusy ? 'default' : 'grab',
                    fontSize: tileFontSize, fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif", color: C.dark,
                    userSelect: 'none', position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                    transform: isSel ? 'scale(1.05)' : isHov ? 'scale(1.02) translateY(-2px)' : 'scale(1)',
                    boxShadow: isSel
                      ? `0 0 0 3px ${C.primary}30, 0 6px 20px rgba(74,77,201,0.15)`
                      : isHov ? '0 4px 14px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.04)',
                    animation: isShaking
                      ? 'mst-shake 0.5s ease-in-out'
                      : `mst-tileFadeIn 0.4s ease-out ${i * 0.05}s both`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
                    fontSize: tileEmojiSize, flexShrink: 0,
                  }}>
                    {tile.emoji}
                  </div>
                  <span style={{ lineHeight: 1.25, minHeight: isMobile ? 28 : 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tile.name}
                  </span>
                  {isSel && (
                    <div style={{
                      position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                      width: 10, height: 10, borderRadius: '50%',
                      background: C.primary, border: `2px solid ${C.white}`,
                      boxShadow: `0 0 0 2px ${C.primary}40`,
                      animation: 'mst-popIn 0.25s ease-out both',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {wrongCount >= 3 && !isComplete && (
          <p style={{
            textAlign: 'center', margin: 0, lineHeight: 1.4,
            fontSize: isMobile ? 11 : 12, color: '#B45309',
            fontFamily: "'Poppins', sans-serif", fontWeight: 500,
            background: '#FEF3C7', padding: '8px 14px', borderRadius: 10,
            animation: 'mst-fadeInUp 0.3s ease-out both',
          }}>
            💡 Tip: Transparent = clear view · Translucent = blurry · Opaque = no light at all.
          </p>
        )}

        {/* ══════════════════ COMPLETION ══════════════════ */}
        {isComplete && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: isMobile ? 14 : 18, padding: '8px 0',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              padding: isMobile ? '16px 20px' : '20px 28px',
              borderRadius: 16, border: `2px solid ${C.lightPurple}`,
              animation: 'mst-popIn 0.5s ease-out 0.2s both',
              boxShadow: '0 8px 24px rgba(74,77,201,0.15)',
              flexDirection: isMobile ? 'column' : 'row',
              textAlign: isMobile ? 'center' : 'left', maxWidth: '100%',
            }}>
              <span style={{ fontSize: isMobile ? 32 : 40, animation: 'mst-starSpin 1s ease-out 0.5s both', display: 'block' }}>🏆</span>
              <div>
                <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: C.purple, fontFamily: "'Poppins', sans-serif" }}>
                  All {totalTiles} sorted correctly!
                </div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: C.primary, fontWeight: 500, fontFamily: "'Poppins', sans-serif", marginTop: 3 }}>
                  {wrongCount === 0 ? '🎯 Perfect — zero mistakes!' : `Accuracy: ${accuracy}% · ${wrongCount} wrong attempt${wrongCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: enableTimer ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: isMobile ? 8 : 12, width: '100%', maxWidth: 500,
              animation: 'mst-fadeInUp 0.5s ease-out 0.4s both',
            }}>
              <StatCard label="Correct" value={correctCount} emoji="✅" bg={C.greenBg} color="#166534" border={C.greenBorder} isMobile={isMobile} />
              <StatCard label="Wrong" value={wrongCount} emoji="❌" bg={C.redBg} color="#991B1B" border={C.redBorder} isMobile={isMobile} />
              {enableTimer && <StatCard label="Time" value={formatTime(seconds)} emoji="⏱️" bg="#EEF2FF" color={C.primary} border="#C7D2FE" isMobile={isMobile} />}
            </div>

            {showTableOnComplete && (
              <div style={{
                width: '100%', maxWidth: 700,
                background: C.white, border: `1.5px solid ${C.lightPurple}`,
                borderRadius: 16, overflow: 'hidden',
                animation: 'mst-fadeInUp 0.5s ease-out 0.6s both',
                boxShadow: '0 4px 16px rgba(74,77,201,0.08)',
              }}>
                <div style={{
                  background: `linear-gradient(135deg, ${C.purple}, ${C.primary})`,
                  padding: isMobile ? '12px 16px' : '13px 20px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div>
                    <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: C.white, fontFamily: "'Poppins', sans-serif" }}>
                      Table 6.4 — Classification of objects
                    </div>
                    <div style={{ fontSize: isMobile ? 10 : 11, color: 'rgba(255,255,255,0.75)', fontFamily: "'Poppins', sans-serif" }}>
                      {successMessage}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 0 }}>
                  {BIN_DEFS.map((bin, bi) => (
                    <div key={bin.id} style={{
                      borderRight: bi < 2 && !isMobile ? `1px solid ${C.bgGrey}` : 'none',
                      borderBottom: isMobile && bi < 2 ? `1px solid ${C.bgGrey}` : 'none',
                    }}>
                      <div style={{
                        padding: isMobile ? '10px 14px' : '11px 14px',
                        background: bin.bg, textAlign: 'center',
                        fontSize: isMobile ? 12 : 13, fontWeight: 700,
                        color: bin.tagColor, fontFamily: "'Poppins', sans-serif",
                        borderBottom: `1px solid ${bin.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <span>{bin.emoji}</span> {binLabels[bin.id]}
                      </div>
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {bins[bin.id].map((it, ri) => (
                          <div key={it.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 8,
                            background: bin.chipBg, fontSize: isMobile ? 11 : 12, fontWeight: 600,
                            color: bin.chipColor, fontFamily: "'Poppins', sans-serif",
                            animation: `mst-tableRowIn 0.4s ease ${ri * 0.08}s both`,
                          }}>
                            <span style={{ fontSize: 15 }}>{it.emoji}</span>
                            {it.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
              border: `2px solid ${C.lightPurple}`, borderRadius: 14,
              padding: isMobile ? '12px 16px' : '14px 20px',
              maxWidth: 580, width: '100%',
              animation: 'mst-fadeInUp 0.5s ease-out 0.8s both',
            }}>
              <div style={{
                fontSize: isMobile ? 12 : 13, fontWeight: 700, color: C.purple,
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>📚</span> Remember
              </div>
              <p style={{
                margin: 0, fontSize: isMobile ? 11.5 : 12.5, color: C.dark,
                lineHeight: 1.55, fontFamily: "'Poppins', sans-serif",
              }}>
                <strong>Transparent</strong> = see clearly through it (glass, water, air).&nbsp;
                <strong>Translucent</strong> = light passes but view is blurry (butter paper, frosted glass).&nbsp;
                <strong>Opaque</strong> = no light passes through (wood, cardboard, metal).
              </p>
            </div>

            <button
              onClick={resetGame}
              style={{
                padding: isMobile ? '10px 22px' : '11px 26px', borderRadius: 24,
                border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 13 : 14, fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                color: C.white, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(74,77,201,0.25)',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                animation: 'mst-fadeInUp 0.4s ease-out 1s both',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(74,77,201,0.32)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(74,77,201,0.25)';
              }}
            >
              <IconRotate size={15} color="#fff" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Style helpers ───
const chipStyle = (bg: string, border: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  background: bg, border: `1px solid ${border}`,
  backdropFilter: 'blur(8px)', padding: '6px 11px', borderRadius: 14,
});
const chipText: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#ffffff' };

// ═══════════════════════════════════════════════════════════════════════════
// ███  MERGED FLOW WRAPPER (default export)  ███
//
// Shows the torch viewer first. Once the student reaches the last learning
// step, a "Start Practice" CTA appears (or auto-advances if enabled), which
// swaps in the sorter game. A two-step progress header sits on top of both.
// ═══════════════════════════════════════════════════════════════════════════

type FlowPhase = 'learn' | 'practice';

interface FlowAdditionalProps {
    autoAdvance?: boolean;          // auto-move to practice when learning ends
    autoAdvanceDelay?: number;      // ms to wait before auto-advancing
    learnPillLabel?: string;
    practicePillLabel?: string;
    ctaLabel?: string;
    ctaHeadline?: string;
    ctaSubtext?: string;
    allowReview?: boolean;          // allow jumping back to the lesson
}

interface MaterialsLightFlowProps {
    props?: {
        width?: number;
        height?: number;
        themeColor?: string;
        darkMode?: boolean;
        torch?: NonNullable<TorchMaterialViewerProps['props']>;
        sorter?: NonNullable<MaterialsSorterProps['props']>;
        additionalProps?: FlowAdditionalProps;
    };
    setStepDetails?: (stepDetails: StepDetails) => void;
    stopAutoNext?: boolean;
    setStopAutoNext?: (stopAutoNext: boolean) => void;
}

const FLOW_KEYFRAMES = `
    @keyframes mlf-fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes mlf-swapIn { from { opacity: 0; transform: translateY(10px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes mlf-ctaPulse {
        0%, 100% { box-shadow: 0 8px 18px -6px rgba(255,114,18,0.5), 0 0 0 0 rgba(255,114,18,0.45); }
        50%      { box-shadow: 0 8px 18px -6px rgba(255,114,18,0.5), 0 0 0 14px rgba(255,114,18,0); }
    }
    @keyframes mlf-checkPop { 0% { transform: scale(0); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
`;

const MaterialsLightFlow: React.FC<MaterialsLightFlowProps> = ({
    props: rawProps,
    setStepDetails,
    stopAutoNext,
    setStopAutoNext,
}) => {
    const p = rawProps ?? {};
    const fa = p.additionalProps ?? {};
    const {
        autoAdvance = false,
        autoAdvanceDelay = 1400,
        learnPillLabel = 'Watch & Learn',
        practicePillLabel = 'Sort & Practice',
        ctaLabel = 'Start Practice',
        ctaHeadline = "You've met all three material types!",
        ctaSubtext = 'Now test yourself — sort the objects into the right bins.',
        allowReview = true,
    } = fa;

    const maxWidth = p.width ?? 980;

    const [phase, setPhase] = useState<FlowPhase>('learn');
    const [reachedEnd, setReachedEnd] = useState(false);
    const [isNarrow, setIsNarrow] = useState<boolean>(
        typeof window !== 'undefined' ? window.innerWidth < 560 : false
    );

    // Inject wrapper-only keyframes
    useEffect(() => {
        const id = 'mlf-keyframes';
        if (document.getElementById(id)) return;
        const el = document.createElement('style');
        el.id = id;
        el.textContent = FLOW_KEYFRAMES;
        document.head.appendChild(el);
        return () => {
            const e = document.getElementById(id);
            if (e) document.head.removeChild(e);
        };
    }, []);

    // Track narrow viewport for the stepper
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onResize = () => setIsNarrow(window.innerWidth < 560);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const goPractice = useCallback(() => {
        setPhase('practice');
        if (setStopAutoNext) setStopAutoNext(true);
    }, [setStopAutoNext]);

    // Optional auto-advance once the lesson reaches its last step
    useEffect(() => {
        if (!autoAdvance || !reachedEnd || phase !== 'learn') return;
        const t = setTimeout(goPractice, autoAdvanceDelay);
        return () => clearTimeout(t);
    }, [autoAdvance, reachedEnd, phase, autoAdvanceDelay, goPractice]);

    // Torch -> wrapper: detect completion + forward step details while learning
    const handleTorchSteps = useCallback((s: StepDetails) => {
        if (s.currentStep >= s.totalSteps) setReachedEnd(true);
        if (phase === 'learn') setStepDetails?.(s);
    }, [phase, setStepDetails]);

    // Sorter -> wrapper: forward step details while practicing
    const handleSorterSteps = useCallback((s: StepDetails) => {
        if (phase === 'practice') setStepDetails?.(s);
    }, [phase, setStepDetails]);

    // ─── Two-step progress header ───
    const renderStepper = () => {
        const steps: { n: number; label: string; state: 'done' | 'active' | 'todo' }[] = [
            { n: 1, label: learnPillLabel, state: phase === 'practice' ? 'done' : 'active' },
            { n: 2, label: practicePillLabel, state: phase === 'practice' ? 'active' : 'todo' },
        ];

        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: isNarrow ? 8 : 14,
                background: THEME.white, borderRadius: 16,
                padding: isNarrow ? '10px 12px' : '12px 18px',
                border: `1.5px solid ${THEME.grayLight}`,
                boxShadow: '0 6px 20px -14px rgba(74,77,201,0.35)',
                marginBottom: 14,
            }}>
                {steps.map((st, i) => {
                    const active = st.state === 'active';
                    const done = st.state === 'done';
                    return (
                        <React.Fragment key={st.n}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isNarrow ? 7 : 10, minWidth: 0 }}>
                                <div style={{
                                    width: isNarrow ? 26 : 30, height: isNarrow ? 26 : 30,
                                    borderRadius: 999, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: isNarrow ? 12 : 13,
                                    color: (active || done) ? THEME.white : THEME.primaryDeep,
                                    background: active ? THEME.gradientPurple
                                        : done ? THEME.gradientOrange : THEME.lightPurple,
                                    boxShadow: (active || done) ? '0 6px 14px -6px rgba(83,48,134,0.5)' : 'none',
                                    transition: 'all 0.35s ease',
                                }}>
                                    {done
                                        ? <span style={{ animation: 'mlf-checkPop 0.4s ease-out' }}>✓</span>
                                        : st.n}
                                </div>
                                {!isNarrow && (
                                    <span style={{
                                        fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                                        fontFamily: THEME.fontFamily,
                                        color: active ? THEME.primaryDeep : done ? THEME.accent : THEME.grayMid,
                                    }}>
                                        {st.label}
                                    </span>
                                )}
                            </div>
                            {i === 0 && (
                                <div style={{
                                    flex: 1, height: 3, borderRadius: 999, minWidth: 18,
                                    background: phase === 'practice' ? THEME.gradientOrange : THEME.grayLight,
                                    transition: 'background 0.4s ease',
                                }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    // ─── Call-to-action shown at the end of the lesson ───
    const renderCTA = () => (
        <div style={{
            marginTop: 16,
            display: 'flex', flexDirection: isNarrow ? 'column' : 'row',
            alignItems: 'center', justifyContent: 'space-between', gap: 14,
            background: THEME.gradientSoftOrange,
            borderRadius: 18, padding: isNarrow ? '16px 16px' : '16px 22px',
            border: `1.5px solid ${THEME.accentSoft}`,
            animation: 'mlf-fadeInUp 0.5s ease-out both',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span style={{ fontSize: 30, flexShrink: 0 }}>🎉</span>
                <div>
                    <div style={{
                        fontSize: isNarrow ? 14 : 15, fontWeight: 800, color: THEME.primaryDeep,
                        fontFamily: THEME.fontFamily, lineHeight: 1.25,
                    }}>
                        {ctaHeadline}
                    </div>
                    <div style={{
                        fontSize: isNarrow ? 11.5 : 12.5, fontWeight: 500, color: THEME.grayDark,
                        fontFamily: THEME.fontFamily, marginTop: 2, lineHeight: 1.4,
                    }}>
                        {ctaSubtext}
                    </div>
                </div>
            </div>
            <button
                onClick={goPractice}
                style={{
                    flexShrink: 0, width: isNarrow ? '100%' : 'auto',
                    padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: THEME.gradientOrange, color: THEME.white,
                    fontSize: 14, fontWeight: 700, fontFamily: THEME.fontFamily,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    animation: 'mlf-ctaPulse 2.2s ease-in-out infinite',
                    transition: 'transform 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
                {ctaLabel} <ArrowRight size={18} />
            </button>
        </div>
    );

    // ─── Small "review lesson" link shown during practice ───
    const renderReviewLink = () => (
        <button
            onClick={() => setPhase('learn')}
            style={{
                alignSelf: 'flex-start', marginBottom: 12,
                padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                background: THEME.white, color: THEME.primary,
                border: `1.5px solid ${THEME.lightPurple}`,
                fontSize: 13, fontWeight: 600, fontFamily: THEME.fontFamily,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'transform 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
            <ChevronLeft size={16} /> Review the lesson
        </button>
    );

    return (
        <div style={{
            width: '100%', maxWidth, margin: '0 auto',
            fontFamily: THEME.fontFamily, boxSizing: 'border-box',
        }}>
            {renderStepper()}

            {phase === 'learn' ? (
                <div key="phase-learn" style={{ animation: 'mlf-swapIn 0.4s ease-out' }}>
                    <TorchMaterialViewer
                        props={p.torch}
                        setStepDetails={handleTorchSteps}
                        stopAutoNext={stopAutoNext}
                        setStopAutoNext={setStopAutoNext}
                    />
                    {reachedEnd && renderCTA()}
                </div>
            ) : (
                <div key="phase-practice" style={{
                    animation: 'mlf-swapIn 0.4s ease-out',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {allowReview && renderReviewLink()}
                    <MaterialsSorterTool
                        props={p.sorter}
                        setStepDetails={handleSorterSteps}
                        stopAutoNext={stopAutoNext}
                        setStopAutoNext={setStopAutoNext}
                    />
                </div>
            )}
        </div>
    );
};

export default MaterialsLightFlow;

// Named exports kept available in case either tool is needed standalone.
export { TorchMaterialViewer, MaterialsSorterTool };

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════