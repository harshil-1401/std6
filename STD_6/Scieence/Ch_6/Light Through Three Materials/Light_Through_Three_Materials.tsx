// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE START
// File: torch_material_viewer.tsx
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
} from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type ModeType = 'learn' | 'practice' | 'real_world' | 'hands_on';
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

const DEFAULT_STEPS: StepDataInterface[] = [
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

// ==================== MAIN COMPONENT ====================

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
    const [currentMode, _setCurrentMode] = useState<ModeType>(config.initialMode);
    const [filteredSteps, setFilteredSteps] = useState<StepDataInterface[]>([]);
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
                                /*
                                  Arm drawn as a connected path:
                                  - Shoulder joint at (44, 32) — right edge of body
                                  - Upper arm goes up-right, forearm bends at elbow, hand at tip
                                  - All in one <g> that rotates around the shoulder point
                                  - Wave keyframe rocks this whole group back and forth
                                */
                                <g style={{ transformOrigin: '44px 32px', animation: 'wave 1.8s ease-in-out infinite' }}>
                                    {/* upper arm — from shoulder (44,32) going up */}
                                    <rect x="40" y="14" width="9" height="20" rx="4" fill={THEME.primaryDeep} />
                                    {/* forearm — from elbow (44,14) tilted slightly outward */}
                                    <rect x="42" y="0" width="8" height="16" rx="4"
                                        transform="rotate(15 46 14)" fill={THEME.primaryDeep} />
                                    {/* hand — circle attached at tip of forearm */}
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
                            {/* right arm — resting position in ghost */}
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
                    {/* Inline torch icon — no external icon dependency */}
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

            {/* 3-POSITION SLIDER — placed above the stage so the student picks the material first */}
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

            {/* CAPTION (live classification) */}
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

export default TorchMaterialViewer;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CODE END
// ═══════════════════════════════════════════════════════════════════════════