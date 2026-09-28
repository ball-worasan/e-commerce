'use client';

import {
  ChangeEvent,
  ClipboardEvent,
  CSSProperties,
  KeyboardEvent,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
// Placeholder until auth-service exposes a real verify-otp endpoint.
const DEMO_VALID_CODE = '123456';

type Phase = 'idle' | 'spark' | 'arrange' | 'pulse' | 'merge' | 'success' | 'shake';

// Matches .otpBox in page.module.css — there's no shared token for these
// dimensions yet, so this is the single place in the JS layer that encodes
// them; both the natural row layout and the ring layout read from here.
const BOX_WIDTH = 44;
const BOX_HEIGHT = 52;
const BOX_GAP = 10;

// Each box's horizontal offset from the row's center in its resting position.
const NATURAL_X = Array.from({ length: OTP_LENGTH }, (_, index) => (index - (OTP_LENGTH - 1) / 2) * (BOX_WIDTH + BOX_GAP));

// Ring layout used for the 'arrange'/'pulse' phases: boxes evenly spaced
// around a circle with at least `minGap` px between the closest edges of any
// two boxes — not just angular neighbors, see computeRingLayout.
const RING = {
  count: OTP_LENGTH,
  boxW: BOX_WIDTH,
  boxH: BOX_HEIGHT,
  minGap: 16, // minimum gap between any two boxes' edges (px)
  startAngle: -90, // degrees; -90 = first box at the top
  mode: 'upright' as 'upright' | 'radial',
} as const;

export type RingBox = { x: number; y: number; angleDeg: number; rotationDeg: number };

export type RingConfig = {
  count: number;
  boxW: number;
  boxH: number;
  minGap: number;
  startAngle: number;
  mode: 'upright' | 'radial';
};

function ringCenters(radius: number, cfg: Pick<RingConfig, 'count' | 'startAngle'>) {
  const { count, startAngle } = cfg;
  const step = 360 / count;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  return Array.from({ length: count }, (_, index) => {
    const theta = toRad(startAngle + index * step);
    return { cx: radius * Math.cos(theta), cy: radius * Math.sin(theta) };
  });
}

// Real edge-to-edge distance between two same-size axis-aligned boxes offset
// by (dx, dy); 0 once their projections overlap on an axis. Every pair, not
// just angular neighbors — for extreme aspect ratios a non-adjacent pair can
// end up the closest one.
function pairGaps(radius: number, cfg: Pick<RingConfig, 'count' | 'startAngle' | 'boxW' | 'boxH'>) {
  const { count, boxW, boxH } = cfg;
  const centers = ringCenters(radius, cfg);
  const gaps: { i: number; j: number; gap: number }[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = Math.abs(centers[i].cx - centers[j].cx);
      const dy = Math.abs(centers[i].cy - centers[j].cy);
      const gapX = Math.max(0, dx - boxW);
      const gapY = Math.max(0, dy - boxH);
      gaps.push({ i, j, gap: Math.hypot(gapX, gapY) });
    }
  }
  return gaps;
}

function minAabbGap(radius: number, cfg: Pick<RingConfig, 'count' | 'startAngle' | 'boxW' | 'boxH'>): number {
  return Math.min(...pairGaps(radius, cfg).map((pair) => pair.gap));
}

// Smallest radius with minAabbGap(radius) >= minGap. minAabbGap is
// monotonically non-decreasing in radius (every pair's dx, dy grow linearly
// with it), so this is a plain bisection: grow the upper bound until it
// clears minGap, then binary search down to the boundary.
function findMinRadius(cfg: Pick<RingConfig, 'count' | 'startAngle' | 'boxW' | 'boxH' | 'minGap'>): number {
  const { boxW, boxH, minGap } = cfg;
  let lo = 0;
  let hi = Math.max(boxW, boxH, 1) + Math.max(minGap, 1);
  for (let guard = 0; guard < 64 && minAabbGap(hi, cfg) < minGap; guard++) {
    hi *= 2;
  }
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (minAabbGap(mid, cfg) < minGap) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

export type RingBindingPair = { i: number; j: number; stepsApart: number };

// Pure function: given a ring config, returns each box's absolute top-left
// offset within a container centered on the ring's true geometric center —
// always (0, 0), since evenly spaced points sum to zero for any startAngle —
// the tight radius used, and the pair of boxes whose gap is exactly minGap
// (whatever is currently squeezing the radius: boxW, boxH, or a non-adjacent
// pair — see stepsApart).
export function computeRingLayout(cfg: RingConfig): {
  radius: number;
  boxes: RingBox[];
  bindingPair: RingBindingPair;
} {
  const { count, boxW, boxH, minGap, startAngle, mode } = cfg;
  if (mode !== 'upright') {
    throw new Error(`computeRingLayout: mode "${mode}" is not implemented`);
  }

  const radius = findMinRadius({ count, startAngle, boxW, boxH, minGap });
  const centers = ringCenters(radius, { count, startAngle });

  const boxes: RingBox[] = centers.map(({ cx, cy }, index) => ({
    x: cx - boxW / 2,
    y: cy - boxH / 2,
    angleDeg: startAngle + index * (360 / count),
    rotationDeg: 0,
  }));

  const binding = pairGaps(radius, { count, startAngle, boxW, boxH }).reduce((best, pair) =>
    pair.gap < best.gap ? pair : best
  );
  const rawDiff = Math.abs(binding.i - binding.j);
  const bindingPair: RingBindingPair = {
    i: binding.i,
    j: binding.j,
    stepsApart: Math.min(rawDiff, count - rawDiff),
  };

  if (process.env.NODE_ENV !== 'production') {
    const adjacentGaps = centers.map(({ cx, cy }, index) => {
      const next = centers[(index + 1) % count];
      const dx = Math.abs(cx - next.cx);
      const dy = Math.abs(cy - next.cy);
      const gapX = Math.max(0, dx - boxW);
      const gapY = Math.max(0, dy - boxH);
      return Math.hypot(gapX, gapY);
    });
    const spread = Math.max(...adjacentGaps) - Math.min(...adjacentGaps);
    if (spread > 0.2 * minGap) {
      console.warn(
        `computeRingLayout: adjacent-gap spread ${spread.toFixed(2)}px exceeds 20% of minGap (${minGap}px) for config`,
        cfg
      );
    }
  }

  return { radius, boxes, bindingPair };
}

const RING_LAYOUT = computeRingLayout(RING);

// Delta from each box's natural row position to its target ring position,
// expressed as a translate offset (CSS transform is relative, not absolute),
// so getBoxStyle keeps applying it the same way as before.
const ARRANGE_OFFSETS = NATURAL_X.map((naturalX, index) => {
  const box = RING_LAYOUT.boxes[index];
  return {
    x: box.x + RING.boxW / 2 - naturalX,
    y: box.y + RING.boxH / 2,
  };
});

const MERGE_OFFSETS = NATURAL_X.map((naturalX) => ({ x: -naturalX, y: 0 }));

function getBoxStyle(index: number, phase: Phase): CSSProperties {
  if (phase === 'arrange' || phase === 'pulse') {
    const { x, y } = ARRANGE_OFFSETS[index];
    return { transform: `translate(${x}px, ${y}px)` };
  }
  if (phase === 'merge' || phase === 'success') {
    const { x, y } = MERGE_OFFSETS[index];
    return { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 0 };
  }
  return {};
}

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const timeoutIds = useRef<number[]>([]);

  const isAnimating = phase !== 'idle';
  const refCode = email ? generateRefCode(email) : '';
  const ringExpanded = phase === 'arrange' || phase === 'pulse';

  const boxRef = useRef<HTMLDivElement>(null);
  const refCodeRef = useRef<HTMLParagraphElement>(null);
  const resendTextRef = useRef<HTMLParagraphElement>(null);
  const [ringScale, setRingScale] = useState(1);

  // The ring's natural (unscaled) height needs to fit between the ref-code
  // line and the resend line without unmounting or repositioning either —
  // that reflows the card mid-animation and shifts the ring's own center.
  // Measure the real gap live (font/viewport dependent, not a fixed px) and
  // shrink the whole ring uniformly (radius and boxes together) to fit, down
  // to a floor where it'd stop being legible.
  useLayoutEffect(() => {
    const measure = () => {
      const refEl = refCodeRef.current;
      const resendEl = resendTextRef.current;
      if (!refEl || !resendEl) return;
      const available = resendEl.getBoundingClientRect().top - refEl.getBoundingClientRect().bottom;
      const ringNaturalHeight = 2 * (RING_LAYOUT.radius + RING.boxH / 2);
      // Real headroom, not just sub-pixel/rounding slack: box3's measured
      // bottom edge cleared resendText's top by under 1.1px at a 4px margin,
      // because the wrapper's scale and the boxes' own translate transition
      // don't settle at exactly the same instant (see the transition below).
      const safetyMarginPx = 16;
      const fitScale = (available - safetyMarginPx) / ringNaturalHeight;
      setRingScale(Math.min(1, Math.max(0.45, fitScale)));
    };

    measure();
    const target = boxRef.current;
    if (!target) return;
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!email) {
      router.replace('/');
    }
  }, [email, router]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setSecondsLeft((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (digits.every((digit) => digit !== '') && phase === 'idle') {
      runVerificationSequence();
    }
  }, [digits, phase]);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function schedule(callback: () => void, delay: number) {
    timeoutIds.current.push(window.setTimeout(callback, delay));
  }

  function runVerificationSequence() {
    const code = digits.join('');

    setPhase('spark');
    schedule(() => setPhase('arrange'), 700);
    schedule(() => setPhase('pulse'), 1300);
    schedule(() => setPhase('merge'), 1800);
    schedule(() => {
      if (code === DEMO_VALID_CODE) {
        setPhase('success');
        return;
      }
      setPhase('shake');
      schedule(() => {
        setDigits(Array(OTP_LENGTH).fill(''));
        setPhase('idle');
        inputsRef.current[0]?.focus();
      }, 500);
    }, 2300);
  }

  function handleDigitChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  }

  function handleResend() {
    if (secondsLeft > 0) return;
    setSecondsLeft(RESEND_SECONDS);
    setDigits(Array(OTP_LENGTH).fill(''));
    setPhase('idle');
    inputsRef.current[0]?.focus();
  }

  return (
    <div className={styles.boxContainer}>
      <div className={styles.box} ref={boxRef}>
        <h1 className={styles.title}>Verification Required</h1>
        <p className={styles.subtitle}>A verification code has been sent to</p>
        <p className={styles.email}>{email}</p>
        {refCode && (
          <p className={styles.refCode} ref={refCodeRef}>
            Ref: {refCode}
          </p>
        )}

        <div
          className={phase === 'shake' ? `${styles.otpInputs} ${styles.shaking}` : styles.otpInputs}
          style={{
            // `transition` stays present on every render (only `transform`'s
            // value toggles) — otherwise the parent's scale snaps instantly
            // at the phase boundary while the boxes' own 0.5s transform
            // transition is still catching up, popping them to full size
            // for a frame or two.
            transform: ringExpanded ? `scale(${ringScale})` : 'scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onPaste={handlePaste}
        >
          {digits.map((digit, index) => (
            <div
              key={index}
              className={
                phase === 'spark' ? `${styles.otpBoxWrapper} ${styles.sparking}` : styles.otpBoxWrapper
              }
              style={getBoxStyle(index, phase)}
            >
              <svg className={styles.borderRunner} viewBox="0 0 48 56" aria-hidden="true">
                <rect x="2" y="2" width="44" height="52" rx="6" ry="6" pathLength={100} />
              </svg>
              <input
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className={phase === 'pulse' ? `${styles.otpBox} ${styles.pulsing}` : styles.otpBox}
                value={digit}
                disabled={isAnimating}
                onChange={(event) => handleDigitChange(index, event)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                aria-label={`Digit ${index + 1}`}
              />
            </div>
          ))}

          <div className={phase === 'success' ? `${styles.resultOverlay} ${styles.showSuccess}` : styles.resultOverlay}>
            <CheckCircleIcon />
          </div>
        </div>

        <span className={styles.srOnly} aria-live="polite">
          {phase === 'success'
            ? 'Code verified'
            : phase === 'shake'
              ? 'Incorrect code'
              : isAnimating
                ? 'Verifying code'
                : ''}
        </span>

        <p className={styles.resendText} ref={resendTextRef}>
          Haven&apos;t received it?{' '}
          {secondsLeft > 0 ? (
            <span className={styles.resendMuted}>Resend code in {secondsLeft}s</span>
          ) : (
            <button type="button" className={styles.resendLink} onClick={handleResend}>
              Resend code
            </button>
          )}
        </p>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="#8FC9A6" strokeWidth="1.5" />
      <path d="M7 12.5l3 3 7-7" stroke="#8FC9A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function generateRefCode(email: string) {
  // Placeholder ref code derived from the email until auth-service issues a real one.
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).slice(0, 6).toUpperCase();
}
