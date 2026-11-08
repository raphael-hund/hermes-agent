import { useId } from 'react'

import { cn } from '@/lib/utils'

/**
 * The Hermes mark for the calm workspace: a small light ghost circled by two
 * fine orbits. Unlike `BrandMark` (the Nous tile for hero/update moments) it
 * sits on the surface with no backdrop, so it works at sidebar scale.
 *
 * Orbit colors come from the semantic palette tokens, never literals, so a
 * skin that retunes `--ui-red` / `--ui-blue` / `--ui-green` moves them too.
 * The ghost body uses the foreground ink; its eyes punch through to the
 * surface below. Purely decorative unless a `label` is passed.
 */
export function HermesMark({ className, label, size = 72 }: { className?: string; label?: string; size?: number }) {
  const maskId = useId()

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn('hermes-mark shrink-0', className)}
      data-slot="hermes-mark"
      height={size}
      role={label ? 'img' : undefined}
      viewBox="0 0 96 96"
      width={size}
    >
      <defs>
        <mask id={maskId}>
          <rect fill="white" height="96" width="96" />
          {/* Eyes and a tiny mouth cut out of the body. */}
          <ellipse cx="41" cy="44" fill="black" rx="3.2" ry="4.4" />
          <ellipse cx="57" cy="44" fill="black" rx="3.2" ry="4.4" />
          <path d="M45.5 55.5 q2.5 2.4 5 0" fill="none" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </mask>
      </defs>
      {/* Back halves of the orbits, behind the body. */}
      <g className="hermes-mark__orbits" fill="none" strokeLinecap="round" strokeWidth="1.6">
        <ellipse cx="48" cy="50" rx="42" ry="14" stroke="var(--ui-red)" transform="rotate(-18 48 50)" />
        <ellipse cx="48" cy="50" rx="38" ry="12" stroke="var(--ui-green)" transform="rotate(24 48 50)" />
      </g>
      {/* Ghost body: round head, soft scalloped hem. */}
      <path
        d="M48 18c-15.5 0-26 11.5-26 27v24c0 2.6 2.9 4 5 2.4l4.2-3.2a3 3 0 0 1 3.6 0l4.6 3.4a3 3 0 0 0 3.6 0l3.2-2.4a3 3 0 0 1 3.6 0l3.2 2.4a3 3 0 0 0 3.6 0l4.6-3.4a3 3 0 0 1 3.6 0l4.2 3.2c2.1 1.6 5 .2 5-2.4V45c0-15.5-10.5-27-26-27Z"
        fill="var(--ui-text-primary)"
        mask={`url(#${maskId})`}
      />
      {/* Front arc of the blue orbit crosses over the body. */}
      <path
        d="M10 58 C 26 74, 70 74, 88 54"
        fill="none"
        stroke="var(--ui-blue)"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}
