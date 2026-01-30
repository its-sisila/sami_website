"use client"

import { useEffect, useRef } from "react"

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 1.0
  maxForce = 0.1
  particleSize = 10
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    // Check if particle is close enough to its target to slow down
    let proximityMult = 1
    const distance = Math.sqrt(Math.pow(this.pos.x - this.target.x, 2) + Math.pow(this.pos.y - this.target.y, 2))

    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget
    }

    // Add force towards target
    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    }

    const magnitude = Math.sqrt(towardsTarget.x * towardsTarget.x + towardsTarget.y * towardsTarget.y)
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    }

    const steerMagnitude = Math.sqrt(steer.x * steer.x + steer.y * steer.y)
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce
      steer.y = (steer.y / steerMagnitude) * this.maxForce
    }

    this.acc.x += steer.x
    this.acc.y += steer.y

    // Move particle
    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    // Blend towards target color
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    }

    // Calculate current color
    const currentColor = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    }

    if (drawAsPoints) {
      ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
    } else {
      ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`
      ctx.beginPath()
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  kill(width: number, height: number, fadeColor: { r: number; g: number; b: number }) {
    if (!this.isKilled) {
      // Generate random angle from 0 to 2π (full circle)
      const angle = Math.random() * Math.PI * 2
      const mag = (width + height) / 2

      // Calculate position on circle perimeter at distance 'mag' from center
      const centerX = width / 2
      const centerY = height / 2
      const exitX = centerX + Math.cos(angle) * mag
      const exitY = centerY + Math.sin(angle) * mag

      this.target.x = exitX
      this.target.y = exitY

      // Begin blending color to target fade color
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = fadeColor
      this.colorWeight = 0

      this.isKilled = true
    }
  }
}


interface ParticleTextEffectProps {
  words?: string[]
  backgroundColor?: string
  particleColor?: { r: number; g: number; b: number }
  fadeColor?: { r: number; g: number; b: number }
}

const DEFAULT_WORDS = ["Protect", "Predict", "Profit", "SAMI"]

export function ParticleTextEffect({
  words = DEFAULT_WORDS,
  backgroundColor = "black",
  particleColor = { r: 255, g: 255, b: 255 },
  fadeColor = { r: 0, g: 0, b: 0 }
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const frameCountRef = useRef(0)
  const wordIndexRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isRightClick: false })

  const pixelSteps = 6
  const drawAsPoints = true

  const generateRandomPos = (
    x: number,
    y: number,
    mag: number,
    canvasWidth: number,
    canvasHeight: number,
  ): Vector2D => {
    // Generate random angle from 0 to 2π (full circle)
    const angle = Math.random() * Math.PI * 2

    // Calculate position on circle perimeter at distance 'mag' from center
    const startX = x + Math.cos(angle) * mag
    const startY = y + Math.sin(angle) * mag

    return {
      x: startX,
      y: startY,
    }
  }

  const nextWord = (word: string, canvas: HTMLCanvasElement) => {
    // Create off-screen canvas for text rendering
    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenCtx = offscreenCanvas.getContext("2d")!

    // Draw text
    offscreenCtx.fillStyle = "white"
    offscreenCtx.font = "bold 100px Arial"
    offscreenCtx.textAlign = "center"
    offscreenCtx.textBaseline = "middle"
    offscreenCtx.fillText(word, canvas.width / 2, canvas.height / 3)

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    const particles = particlesRef.current
    let particleIndex = 0

    // Collect coordinates
    const coordsIndexes: number[] = []
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) {
      coordsIndexes.push(i)
    }

    // Shuffle coordinates for fluid motion
    for (let i = coordsIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[coordsIndexes[i], coordsIndexes[j]] = [coordsIndexes[j]!, coordsIndexes[i]!]
    }

    for (const coordIndex of coordsIndexes) {
      const pixelIndex = coordIndex
      const alpha = pixels[pixelIndex + 3]!

      if (alpha > 0) {
        const x = (pixelIndex / 4) % canvas.width
        const y = Math.floor(pixelIndex / 4 / canvas.width)

        let particle: Particle

        if (particleIndex < particles.length) {
          particle = particles[particleIndex]!
          particle.isKilled = false
          particleIndex++
        } else {
          particle = new Particle()

          const randomPos = generateRandomPos(
            canvas.width / 2,
            canvas.height / 2,
            (canvas.width + canvas.height) / 2,
            canvas.width,
            canvas.height,
          )
          particle.pos.x = randomPos.x
          particle.pos.y = randomPos.y

          particle.maxSpeed = Math.random() * 6 + 4
          particle.maxForce = particle.maxSpeed * 0.05
          particle.particleSize = Math.random() * 6 + 6
          particle.colorBlendRate = Math.random() * 0.0275 + 0.0025

          particles.push(particle)
        }

        // Set color transition
        particle.startColor = {
          r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
          g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
          b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight,
        }
        particle.targetColor = particleColor
        particle.colorWeight = 0

        particle.target.x = x
        particle.target.y = y
      }
    }

    // Kill remaining particles
    for (let i = particleIndex; i < particles.length; i++) {
      particles[i]!.kill(canvas.width, canvas.height, fadeColor)
    }
  }

  // Helper to convert hex/color string to rgba for background clearing
  // Since we can't easily parse named colors or all css strings to rgba without a canvas,
  // we will simply use fillRect with the passed color but with opacity if it were possible.
  // HOWEVER, for the trail effect, we need to draw a semi-transparent rectangle of the background color.
  // This is tricky if 'backgroundColor' is a non-simple format.
  // For simplicity, we'll assume a hex or rgb string is passed, or we just rely on the user passing a valid color.
  // But wait, standard transparency trick is fillStyle = bgColor with alpha. 
  // If user passes "black", we want "rgba(0,0,0,0.1)".
  // If "rgb(20,20,20)", we want "rgba(20,20,20,0.1)".
  // Since parsing custom CSS colors is hard, let's stick to a simpler approach:
  // We will assume the background color is solid, and we will try to use it.

  // Actually, to keep it simple and robust:
  // If the user wants to use this component, they probably want the "trail" effect.
  // The trail effect inherently depends on painting over the previous frame with a low-alpha background color.
  // I will just default to the assumption that we use the provided backgroundColor string, 
  // but we can't easily add alpha to it if it's "black".

  // Let's modify the props to accept `trailAlpha` maybe? Or just use a fixed one.
  // Better yet, let's just use `globalCompositeOperation` 'destination-out' maybe?
  // No, that clears.

  // Let's just hardcode the trail color logic for now to hex conversion if possible or just request rgba.
  // OR, for this specific task, I can just allow passing the *clearing color* specifically.

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")!
    const particles = particlesRef.current

    // Background with motion blur
    if (backgroundColor === "transparent") {
      // For transparent background, we "fade out" existing pixels
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)" // Alpha controls fade speed
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = "source-over"
    } else {
      // For solid background, we paint a semi-transparent layer of that color
      ctx.globalAlpha = 0.1
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1.0
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]!
      particle.move()
      particle.draw(ctx, drawAsPoints)

      // Remove dead particles that are out of bounds
      if (particle.isKilled) {
        if (
          particle.pos.x < 0 ||
          particle.pos.x > canvas.width ||
          particle.pos.y < 0 ||
          particle.pos.y > canvas.height
        ) {
          particles.splice(i, 1)
        }
      }
    }

    // Handle mouse interaction
    if (mouseRef.current.isPressed && mouseRef.current.isRightClick) {
      particles.forEach((particle) => {
        const distance = Math.sqrt(
          Math.pow(particle.pos.x - mouseRef.current.x, 2) + Math.pow(particle.pos.y - mouseRef.current.y, 2),
        )
        if (distance < 50) {
          particle.kill(canvas.width, canvas.height, fadeColor)
        }
      })
    }

    // Auto-advance words
    frameCountRef.current++
    if (frameCountRef.current % 240 === 0) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length
      nextWord(words[wordIndexRef.current]!, canvas)
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        // Use devicePixelRatio for sharper text/particles if desired, but might be slow.
        // Keeping it simple as per original code, just match client size.
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
      }
    }

    // Initial resize
    resizeCanvas()

    // Initialize with first word
    nextWord(words[0]!, canvas)

    // Start animation
    animate()

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isPressed = true
      mouseRef.current.isRightClick = e.button === 2
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    const handleMouseUp = () => {
      mouseRef.current.isPressed = false
      mouseRef.current.isRightClick = false
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const handleResize = () => {
      resizeCanvas()
      // Reinitialize particles with new dimensions
      nextWord(words[wordIndexRef.current]!, canvas)
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("contextmenu", handleContextMenu)
    window.addEventListener("resize", handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("contextmenu", handleContextMenu)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div className="w-full h-full absolute inset-0">
      <canvas ref={canvasRef} className="w-full h-full" style={{ background: backgroundColor, zIndex: 10 }} />
    </div>
  )
}

