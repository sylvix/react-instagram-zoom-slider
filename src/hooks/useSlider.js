import { useRef, useState, useCallback, useEffect } from 'react'
import { useSpring } from 'react-spring'
import { useDrag } from 'react-use-gesture'
import { clamp } from '../helpers'

export default function useSlider({ initialSlide, slides, onSlideUpdate, width = 400 }) {
  const index = useRef(initialSlide)

  const [{ x, scale }, set] = useSpring(() => {
    return ({
      x: -width,
      scale: 1,
      config: { tension: 270, clamp: true },
    })
  })

  useEffect(() => {
    set({
      x: -index.current * width,
      immediate: true,
    });
  }, [set]);

  // Slide numbers (for display purposes only)
  const [currentSlide, updateSlide] = useState(initialSlide)
  const [zooming, setZooming] = useState(false)
  const isDragging = useRef(false)

  const onScale = useCallback(
    slideProps => {
      set({ scale: slideProps.scale })
      if (slideProps.scale === 1) {
        setZooming(false)
      } else {
        setZooming(true)
      }
    },
    [set]
  )

  const bind = useDrag(
    ({
      down,
      movement: [xMovement],
      direction: [xDir],
      distance,
      swipe: [swipeX],
      cancel,
      touches,
      first,
      last,
    }) => {
      // We don't want to interrupt the pinch-to-zoom gesture
      if (touches > 1) {
        cancel()
      }

      if (first) {
        isDragging.current = true;
      } else if (last) {
        requestAnimationFrame(() => isDragging.current = false);
      }

      // We have swiped past halfway
      if (!down && distance > width / 2) {
        // Move to the next slide
        const slideDir = xDir > 0 ? -1 : 1
        index.current = clamp(index.current + slideDir, 0, slides.length - 1)

        set({
          x: -index.current * width + (down ? xMovement : 0),
          immediate: false,
        });
        onSlideUpdate(index.current)
      } else if (swipeX !== 0) {
        // We have detected a swipe - update the new index
        index.current = clamp(index.current - swipeX, 0, slides.length - 1)
        onSlideUpdate(index.current)
      }

      // Animate the transition
      set({
        x: -index.current * width + (down ? xMovement : 0),
        immediate: down,
      })

      // Update the slide number for display purposes
      updateSlide(index.current)
    },
    {
      axis: 'x',
      bounds: {
        left: currentSlide === slides.length - 1 ? 0 : -Infinity,
        right: index.current === 0 ? 0 : Infinity,
        top: 0,
        bottom: 0,
      },
      rubberband: true,
      enabled: slides.length > 1,
    }
  )

  return [zooming, scale, currentSlide, bind, x, onScale, isDragging]
}
