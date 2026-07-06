import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  maxTilt?: number;
}

/** 3D tilt-on-hover wrapper. Subtle by default — premium, not gimmicky. */
export function TiltCard({ children, className, maxTilt = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), { stiffness: 260, damping: 24 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), { stiffness: 260, damping: 24 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div ref={ref} className={cn('[perspective:900px]', className)} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}
