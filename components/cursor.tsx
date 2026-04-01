'use client'

import { useEffect, useRef } from 'react'

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`
        cursorRef.current.style.top  = `${e.clientY}px`
      }
      setTimeout(() => {
        if (ringRef.current) {
          ringRef.current.style.left = `${e.clientX}px`
          ringRef.current.style.top  = `${e.clientY}px`
        }
      }, 80)
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      <div ref={cursorRef} className="cursor" />
      <div ref={ringRef}   className="cursor-ring" />
    </>
  )
}
