import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from './App.tsx'

describe('App', () => {
  it('renders an honest M0 walking-skeleton state', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('Remote-sensing workflows')
    expect(markup).toContain('M0 walking skeleton')
    expect(markup).toContain('Domain features begin in M1')
  })
})

