import { VercelRequest, VercelResponse } from '@vercel/node'
import { authMiddleware } from '../../lib/auth'
import { successResponse, errorResponse } from '../../lib/response'

declare const document: any
declare const window: any

type Step =
  | { type: 'snapshot'; interactive_only?: boolean }
  | { type: 'click'; ref?: string; selector?: string }
  | { type: 'fill'; ref?: string; selector?: string; value: string }
  | { type: 'type'; ref?: string; selector?: string; value: string }
  | { type: 'select'; ref?: string; selector?: string; value: string }
  | { type: 'press'; key: string }
  | { type: 'wait'; until?: 'time' | 'selector' | 'url' | 'text' | 'load'; value?: string | number; selector?: string }
  | { type: 'extract'; mode?: 'text' | 'html' | 'links' | 'value'; ref?: string; selector?: string }
  | { type: 'scroll'; x?: number; y?: number }
  | { type: 'screenshot'; full_page?: boolean }

type SnapshotElement = {
  ref: string
  tag: string
  role: string | null
  text: string
  selector: string
  type: string | null
  placeholder: string | null
  href: string | null
}

async function loadChromium() {
  try {
    const playwright = await import('@playwright/test')
    return playwright.chromium
  } catch {
    return null
  }
}

async function captureSnapshot(page: any, interactiveOnly = true): Promise<SnapshotElement[]> {
  return page.evaluate((onlyInteractive: boolean) => {
    const interactiveSelector = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[contenteditable="true"]',
      '[onclick]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const candidates = onlyInteractive
      ? Array.from(document.querySelectorAll(interactiveSelector))
      : Array.from(document.querySelectorAll('body *'))

    let counter = 0

    function visible(el: any) {
      const html = el
      const style = window.getComputedStyle(html)
      const rect = html.getBoundingClientRect()
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && rect.width > 0
        && rect.height > 0
    }

    return candidates
      .filter((el: any) => visible(el))
      .slice(0, 200)
      .map((el: any) => {
        counter += 1
        const ref = `e${counter}`
        el.setAttribute('data-claw-ref', ref)
        const html = el
        const text = (html.innerText || html.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160)
        return {
          ref,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          text,
          selector: `[data-claw-ref="${ref}"]`,
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          href: el.getAttribute('href'),
        }
      })
  }, interactiveOnly)
}

function resolveTarget(step: { ref?: string; selector?: string }) {
  if (step.selector) {
    return step.selector
  }
  if (step.ref) {
    return `[data-claw-ref="${step.ref}"]`
  }
  return null
}

async function executeStep(page: any, step: Step, index: number) {
  switch (step.type) {
    case 'snapshot': {
      const elements = await captureSnapshot(page, step.interactive_only !== false)
      return { step: index + 1, type: step.type, elements }
    }
    case 'click': {
      const target = resolveTarget(step)
      if (!target) throw new Error('ELEMENT_NOT_FOUND')
      await page.locator(target).first().click()
      return { step: index + 1, type: step.type, ok: true, target }
    }
    case 'fill': {
      const target = resolveTarget(step)
      if (!target) throw new Error('ELEMENT_NOT_FOUND')
      await page.locator(target).first().fill(step.value)
      return { step: index + 1, type: step.type, ok: true, target }
    }
    case 'type': {
      const target = resolveTarget(step)
      if (!target) throw new Error('ELEMENT_NOT_FOUND')
      await page.locator(target).first().type(step.value)
      return { step: index + 1, type: step.type, ok: true, target }
    }
    case 'select': {
      const target = resolveTarget(step)
      if (!target) throw new Error('ELEMENT_NOT_FOUND')
      await page.locator(target).first().selectOption(step.value)
      return { step: index + 1, type: step.type, ok: true, target }
    }
    case 'press': {
      await page.keyboard.press(step.key)
      return { step: index + 1, type: step.type, ok: true, key: step.key }
    }
    case 'wait': {
      const until = step.until || 'load'
      if (until === 'time') {
        await page.waitForTimeout(Number(step.value || 0))
        return { step: index + 1, type: step.type, ok: true, waited_ms: Number(step.value || 0) }
      }
      if (until === 'selector') {
        const selector = step.selector || String(step.value || '')
        await page.waitForSelector(selector)
        return { step: index + 1, type: step.type, ok: true, matched: selector }
      }
      if (until === 'url') {
        await page.waitForURL(new RegExp(String(step.value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        return { step: index + 1, type: step.type, ok: true, matched: step.value }
      }
      if (until === 'text') {
        const matched = String(step.value || '')
        await page.waitForFunction((expected: string) => document.body.innerText.includes(expected), matched)
        return { step: index + 1, type: step.type, ok: true, matched }
      }

      await page.waitForLoadState(String(step.value || 'networkidle') as any)
      return { step: index + 1, type: step.type, ok: true, matched: String(step.value || 'networkidle') }
    }
    case 'extract': {
      const mode = step.mode || 'text'
      const target = resolveTarget(step) || 'body'
      const locator = page.locator(target).first()

      if (mode === 'html') {
        return { step: index + 1, type: step.type, mode, html: await locator.innerHTML() }
      }
      if (mode === 'links') {
        const links = await page.$$eval(target, (els: any[]) => els.map((el: any) => ({
          text: (el.textContent || '').trim(),
          href: el.getAttribute('href'),
        })))
        return { step: index + 1, type: step.type, mode, links }
      }
      if (mode === 'value') {
        return { step: index + 1, type: step.type, mode, value: await locator.inputValue() }
      }

      return { step: index + 1, type: step.type, mode, text: await locator.innerText() }
    }
    case 'scroll': {
      await page.mouse.wheel(Number(step.x || 0), Number(step.y || 600))
      return { step: index + 1, type: step.type, ok: true, x: Number(step.x || 0), y: Number(step.y || 600) }
    }
    case 'screenshot': {
      const buffer = await page.screenshot({ fullPage: !!step.full_page, type: 'png' })
      return {
        step: index + 1,
        type: step.type,
        ok: true,
        screenshot_base64: buffer.toString('base64'),
      }
    }
    default:
      throw new Error('UNSUPPORTED_STEP')
  }
}

function extractInput(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    return {}
  }

  const requestBody = body as Record<string, unknown>
  if (requestBody.input && typeof requestBody.input === 'object') {
    return requestBody.input as Record<string, unknown>
  }

  return requestBody
}

function resolveViewport(input: Record<string, unknown>) {
  const candidate = input.viewport
  if (
    candidate
    && typeof candidate === 'object'
    && typeof (candidate as Record<string, unknown>).width === 'number'
    && typeof (candidate as Record<string, unknown>).height === 'number'
  ) {
    return {
      width: (candidate as Record<string, number>).width,
      height: (candidate as Record<string, number>).height,
    }
  }

  return { width: 1440, height: 900 }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const input = extractInput(req.body)
  const url = input.url
  const steps = Array.isArray(input.steps) ? input.steps as Step[] : []

  if (!url || typeof url !== 'string') {
    return errorResponse(res, 'INVALID_INPUT', 400, { message: 'url is required' })
  }

  const chromium = await loadChromium()
  if (!chromium) {
    return errorResponse(res, 'BROWSER_RUNTIME_UNAVAILABLE', 500, {
      message: 'Playwright runtime is not installed in this environment',
    })
  }

  const startTime = Date.now()
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext({
      viewport: resolveViewport(input),
      userAgent: typeof input.user_agent === 'string' ? input.user_agent : undefined,
    })
    const page = await context.newPage()

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: typeof input.timeout_ms === 'number' ? input.timeout_ms : 30000,
    })

    const results: Array<Record<string, unknown>> = []
    for (let i = 0; i < steps.length; i += 1) {
      try {
        results.push(await executeStep(page, steps[i], i))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'WORKFLOW_FAILED'
        return errorResponse(res, message, 500, {
          step: i + 1,
          step_type: steps[i]?.type,
        })
      }
    }

    const response: Record<string, unknown> = {
      current_url: page.url(),
      title: await page.title(),
      results,
      _meta: {
        skill: 'browser-operator',
        latency_ms: Date.now() - startTime,
        step_count: steps.length,
      },
    }

    if (input.return_snapshot) {
      response.final_snapshot = await captureSnapshot(page, true)
    }

    if (input.capture_screenshot) {
      const screenshot = await page.screenshot({ fullPage: true, type: 'png' })
      response.screenshot_base64 = screenshot.toString('base64')
    }

    return successResponse(res, response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WORKFLOW_FAILED'
    return errorResponse(res, 'WORKFLOW_FAILED', 500, { message })
  } finally {
    await browser.close()
  }
}

export const __testables = {
  extractInput,
  resolveViewport,
  resolveTarget,
}

export default authMiddleware(handler)
