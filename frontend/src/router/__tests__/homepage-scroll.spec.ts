import { describe, expect, it } from 'vitest'
import { START_LOCATION } from 'vue-router'
import router from '..'

describe('homepage scroll restoration', () => {
  const scroll = router.options.scrollBehavior!

  it('starts a fresh homepage load at the hero even when history contains a saved position', async () => {
    expect(await scroll(router.resolve('/home'), START_LOCATION, { left: 0, top: 900 }))
      .toEqual({ left: 0, top: 0, behavior: 'instant' })
  })

  it('preserves browser back/forward restoration after the app has loaded', async () => {
    const saved = { left: 0, top: 900 }
    expect(await scroll(router.resolve('/home'), router.resolve('/login'), saved)).toEqual(saved)
  })

  it('preserves saved positions on other pages', async () => {
    const saved = { left: 0, top: 400 }
    expect(await scroll(router.resolve('/login'), START_LOCATION, saved)).toEqual(saved)
  })
})
