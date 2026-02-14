'use client';

import { useState, TouchEvent } from 'react';

interface SwipeInput {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    threshold?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: SwipeInput) {
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [touchEndY, setTouchEndY] = useState<number | null>(null);

    const onTouchStart = (e: TouchEvent) => {
        setTouchEndX(null);
        setTouchEndY(null);
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchStartY(e.targetTouches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX);
        setTouchEndY(e.targetTouches[0].clientY);
    };

    const onTouchEnd = () => {
        if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) return;

        const distanceX = touchStartX - touchEndX;
        const distanceY = touchStartY - touchEndY;

        // Ensure it's mostly a horizontal swipe
        if (Math.abs(distanceY) > Math.abs(distanceX)) return;

        const isLeftSwipe = distanceX > threshold;
        const isRightSwipe = distanceX < -threshold;

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        }
        if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }
    };

    return {
        touchStartX,
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
}
