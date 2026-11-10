import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import GatewayHero from '../GatewayHero.vue'
import zh from '@/i18n/locales/zh'
import en from '@/i18n/locales/en'

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
})

function setup(reduced = false) {
  const preference = new EventTarget() as EventTarget & { matches: boolean }
  preference.matches = reduced
  vi.spyOn(window, 'matchMedia').mockReturnValue(preference as MediaQueryList)
  const gradients = () => ({ addColorStop: vi.fn() })
  const context = {
    setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
    createLinearGradient: gradients, createRadialGradient: gradients
  } as unknown as CanvasRenderingContext2D
  const backgroundContext = { ...context, lineTo: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return this.classList.contains('hero-flow') ? backgroundContext : context
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const width = this.classList.contains('hero-visual') ? 1440 : 860
    return { x: 0, y: 0, left: 0, top: 0, width, height: 662, right: width, bottom: 662, toJSON() {} }
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1440)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function () { return this.classList.contains('orbit-core') ? 160 : 108 })
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () { return this.classList.contains('orbit-core') ? 160 : 48 })
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(430)
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(314.45)
  let stamp = 1000, nextId = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.spyOn(performance, 'now').mockImplementation(() => stamp)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++nextId, callback); return nextId })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
  const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh, en } })
  const wrapper = mount(GatewayHero, {
    attachTo: document.body,
    props: { siteName: 'zipkiwi', siteLogo: '', destination: '/login', showModelPlaza: true },
    global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } }
  })
  mounted.push(wrapper)
  const stage = wrapper.get('.orbit-stage').element as HTMLElement
  const captures = new Set<number>()
  stage.hasPointerCapture = id => captures.has(id)
  stage.setPointerCapture = id => { captures.add(id) }
  stage.releasePointerCapture = id => { captures.delete(id) }
  function tick(delta = 20) {
    stamp += delta
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(callback => callback(stamp))
  }
  function pointer(target: EventTarget, type: string, x: number, y = 100) {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    target.dispatchEvent(event)
  }
  return { wrapper, stage, preference, frames, tick, pointer, i18n, context, backgroundContext, captures }
}

describe('ported homepage motion', () => {
  it('redraws a static background when its theme changes without resetting model focus', async () => {
    const { wrapper, tick, preference, backgroundContext } = setup()
    tick()
    await wrapper.get('.orbit-node').trigger('click')
    preference.matches = true
    preference.dispatchEvent(new Event('change'))
    tick()
    const scene = wrapper.get('.orbit-scene').element
    const rotation = scene.getAttribute('data-rotation')
    const fills: string[] = []
    vi.mocked(backgroundContext.fillRect).mockImplementation(() => { fills.push(String(backgroundContext.fillStyle)) })
    const hero = wrapper.element as HTMLElement
    hero.style.setProperty('--zk-bg', '#0b1220')
    hero.style.setProperty('--zk-hero-halo', '#182d50')
    await wrapper.setProps({ isDark: true })
    expect(fills).toContain('#0b1220')
    expect(wrapper.get('.hero-flow').attributes('data-motion')).toBe('reduced')
    expect(wrapper.classes()).toContain('motion-paused')
    expect(scene.getAttribute('data-rotation')).toBe(rotation)
    expect(scene.getAttribute('data-focus-model')).toBe('OpenAI')
    fills.length = 0
    hero.style.setProperty('--zk-bg', '#f7f9fd')
    await wrapper.setProps({ isDark: false })
    expect(fills).toContain('#f7f9fd')
    expect(wrapper.classes()).toContain('motion-paused')
  })

  it('keeps theme style reads outside animation frames', () => {
    const { tick } = setup()
    const reads = vi.spyOn(window, 'getComputedStyle')
    for (let n = 0; n < 5; n++) tick()
    expect(reads).not.toHaveBeenCalled()
  })

  it('does not remeasure badge and logo layout during animation frames', () => {
    const { tick } = setup()
    const reads = ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'].map(key =>
      vi.spyOn(HTMLElement.prototype, key as 'offsetWidth', 'get')
    )
    reads.forEach(read => read.mockClear())
    for (let n = 0; n < 5; n++) tick()
    reads.forEach(read => expect(read).not.toHaveBeenCalled())
  })

  it('moves models along their orbits without sudden frame-to-frame velocity changes', () => {
    const { wrapper, tick, context } = setup()
    tick(1000 / 60)
    const positions = () => wrapper.findAll('.orbit-node').map(node => {
      const match = (node.element as HTMLElement).style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px/)
      return { x: Number(match![1]), y: Number(match![2]) }
    })
    let previous = positions(), velocities = previous.map(() => ({ x: 0, y: 0 })), peak = 0
    for (let n = 0; n < 480; n++) {
      Object.values(context).forEach(value => { if (vi.isMockFunction(value)) value.mockClear() })
      tick(1000 / 60)
      const current = positions()
      const next = current.map((p, i) => ({ x: p.x - previous[i].x, y: p.y - previous[i].y }))
      if (n >= 60) next.forEach((v, i) => { peak = Math.max(peak, Math.hypot(v.x - velocities[i].x, v.y - velocities[i].y)) })
      previous = current
      velocities = next
    }
    expect(peak).toBeLessThan(.15)
  })

  it('keeps every model on the endpoint of its own orbit trail', () => {
    const { wrapper, context, tick } = setup()
    const assertBinding = () => {
      vi.mocked(context.lineTo).mockClear()
      tick()
      const trailPoints = vi.mocked(context.lineTo).mock.calls.slice(-6 * 27)
      wrapper.findAll('.orbit-node').forEach((node, i) => {
        const position = (node.element as HTMLElement).style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px/)
        const endpoint = trailPoints[i * 27 + 26]
        expect(position).not.toBeNull()
        expect(Number(position![1])).toBeCloseTo(endpoint[0], 1)
        expect(Number(position![2])).toBeCloseTo(endpoint[1], 1)
        expect(node.attributes('data-orbit')).toBe(String(i))
      })
    }
    assertBinding()
    for (let n = 0; n < 150; n++) tick()
    assertBinding()
  })

  it('changes its automatic rotation direction smoothly across multiple axes', () => {
    const { wrapper, tick } = setup()
    tick()
    const scene = wrapper.get('.orbit-scene').element as HTMLElement
    const initialYaw = Number(scene.dataset.rotation), initialPitch = Number(scene.dataset.pitch)
    for (let n = 0; n < 200; n++) tick()
    const firstYaw = Number(scene.dataset.rotation)
    expect(Math.abs(Number(scene.dataset.pitch) - initialPitch)).toBeGreaterThan(.03)
    for (let n = 0; n < 200; n++) tick()
    const secondYaw = Number(scene.dataset.rotation)
    expect(Math.abs((secondYaw - firstYaw) - (firstYaw - initialYaw))).toBeGreaterThan(.03)
    expect(scene.dataset.focusSource).toBe('none')
  })

  it('finishes snapping after a short drag is released while the view is easing', () => {
    const { wrapper, stage, pointer, tick } = setup()
    tick()
    pointer(stage, 'pointerdown', 430, 300)
    pointer(window, 'pointermove', 485.3, 332.9)
    pointer(window, 'pointerup', 485.3, 332.9)
    for (let n = 0; n < 15; n++) tick()
    expect(wrapper.get('.orbit-scene').attributes('data-focus-source')).toBe('magnet')
    expect(wrapper.get('.orbit-scene').attributes('data-focus-model')).toBe('OpenAI')
  })

  it('does not snap after a cancelled drag', () => {
    const { wrapper, stage, pointer, tick } = setup()
    tick()
    pointer(stage, 'pointerdown', 430, 300)
    pointer(window, 'pointermove', 485.3, 332.9)
    pointer(window, 'pointercancel', 485.3, 332.9)
    for (let n = 0; n < 15; n++) tick()
    expect(wrapper.get('.orbit-scene').attributes('data-focus-source')).toBe('none')
  })

  it.each([
    { name: 'OpenAI', path: [[55.3, 32.9]] },
    { name: 'Claude', path: [[-252.9, 28.4]] },
    { name: 'Gemini', path: [[-240.6, -136.9]] },
    { name: 'DeepSeek', path: [[-2.5, -114.0]] },
    { name: 'Grok', path: [[293.9, -193.4]] },
    { name: 'Kimi', path: [[0, 104.1], [81.4, 104.1]] }
  ])('snaps $name at the logo edge during a drag and holds through small movements', ({ name, path }) => {
    const { wrapper, stage, pointer, tick } = setup()
    tick()
    const scene = wrapper.get('.orbit-scene')
    pointer(stage, 'pointerdown', 430, 300)
    let x = 430, y = 300
    for (const [dx, dy] of path) {
      const startX = x, startY = y
      for (let n = 1; n <= 40; n++) {
        x = startX + (430 + dx - startX) * n / 40
        y = startY + (300 + dy - startY) * n / 40
        pointer(window, 'pointermove', x, y)
        tick()
        if (scene.attributes('data-focus-source') === 'magnet') break
      }
      if (scene.attributes('data-focus-source') === 'magnet') break
    }
    for (let n = 0; n < 15; n++) tick()
    expect(scene.attributes('data-focus-source')).toBe('magnet')
    expect(scene.attributes('data-focus-model')).toBe(name)
    pointer(window, 'pointermove', x + 8, y + 4)
    tick()
    expect(scene.attributes('data-focus-model')).toBe(name)
    pointer(window, 'pointerup', x + 8, y + 4)
    tick()
    expect(scene.attributes('data-focus-model')).toBe(name)
  })

  it('rotates only on a pressed drag, resumes auto rotation, and releases its resources', () => {
    const { wrapper, stage, tick, pointer, frames, captures } = setup()
    tick()
    const scene = wrapper.get('.orbit-scene').element as HTMLElement
    const initial = Number(scene.dataset.rotation)
    pointer(window, 'pointermove', 650)
    for (let n = 0; n < 12; n++) tick()
    expect(scene.dataset.control).toBe('auto')
    expect(Number(scene.dataset.rotation) - initial).toBeLessThan(.1)
    pointer(stage, 'pointerdown', 100)
    pointer(window, 'pointermove', 400)
    for (let n = 0; n < 15; n++) tick()
    expect(['dragging', 'snapped']).toContain(scene.dataset.control)
    expect(Number(scene.dataset.rotation) - initial).toBeGreaterThan(.2)
    expect(captures.has(1)).toBe(true)
    pointer(window, 'pointerup', 400)
    expect(captures.size).toBe(0)
    for (let n = 0; n < 200; n++) tick()
    expect(scene.dataset.control).toBe('auto')
    expect(wrapper.get('.hero-flow').attributes('data-effect')).toBe('warp')
    expect(wrapper.get('.hero-flow').attributes('data-intensity')).toBe('1.5')
    expect(wrapper.get('.hero-flow').attributes('data-particles')).toBe('330')
    expect(wrapper.get('.hero-flow').attributes('data-scope')).toBe('hero')
    const rotation = scene.dataset.rotation
    wrapper.unmount()
    expect(frames.size).toBe(0)
    pointer(stage, 'pointerdown', 100)
    pointer(window, 'pointermove', 700)
    tick()
    expect(scene.dataset.rotation).toBe(rotation)
  })

  it('preserves model focus and translated descriptions', async () => {
    const { wrapper, tick, i18n } = setup()
    await wrapper.get('.orbit-node').trigger('click')
    tick()
    expect(wrapper.get('.orbit-scene').attributes('data-focus-model')).toBe('OpenAI')
    expect(wrapper.get('.orbit-feature-description').text()).toContain('日常对话')
    i18n.global.locale.value = 'en'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.orbit-feature-description').text()).toContain('everyday conversations')
    await wrapper.get('.orbit-feature-close').trigger('click')
    tick()
    expect(wrapper.get('.orbit-scene').attributes('data-focus-model')).toBe('')
  })

  it('starts static and resumes correctly when the reduced motion preference changes', () => {
    const { wrapper, preference, tick, frames } = setup(true)
    tick()
    expect(wrapper.find('.motion-toggle').exists()).toBe(false)
    expect(wrapper.findAll('.orbit-controls button')).toHaveLength(2)
    expect(wrapper.get('.hero-flow').attributes('data-motion')).toBe('reduced')
    preference.matches = false
    preference.dispatchEvent(new Event('change'))
    tick()
    expect(wrapper.get('.orbit-scene').attributes('data-motion')).toBe('running')
    expect(wrapper.get('.hero-flow').attributes('data-motion')).toBe('running')
    preference.matches = true
    preference.dispatchEvent(new Event('change'))
    tick()
    expect(wrapper.get('.orbit-scene').attributes('data-motion')).toBe('reduced')
    expect(wrapper.get('.hero-flow').attributes('data-motion')).toBe('reduced')
    expect(frames.size).toBe(0)
  })
})
